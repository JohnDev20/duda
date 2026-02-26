from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import base64
import io
from PyPDF2 import PdfReader
import requests
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class Book(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    title: str
    author: Optional[str] = "Desconhecido"
    file_type: str  # "pdf", "epub", "txt"
    file_path: str
    cover_base64: Optional[str] = None
    total_pages: Optional[int] = 0
    current_page: int = 0
    progress: float = 0.0  # 0-100
    status: str = "novo"  # novo, lendo, finalizado, abandonado
    language: Optional[str] = "pt"
    category: Optional[str] = None
    date_added: datetime = Field(default_factory=datetime.utcnow)
    last_opened: Optional[datetime] = None
    file_missing: bool = False
    
    class Config:
        populate_by_name = True


class BookCreate(BaseModel):
    title: str
    author: Optional[str] = "Desconhecido"
    file_type: str
    file_path: str
    cover_base64: Optional[str] = None
    total_pages: Optional[int] = 0
    language: Optional[str] = "pt"
    category: Optional[str] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    current_page: Optional[int] = None
    progress: Optional[float] = None
    status: Optional[str] = None
    last_opened: Optional[datetime] = None
    file_missing: Optional[bool] = None
    category: Optional[str] = None


class Bookmark(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    book_id: str
    page_number: int
    note: Optional[str] = ""
    color: str = "#FF1493"  # rosa padrão
    icon: str = "bookmark"  # ícone padrão
    date_created: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class BookmarkCreate(BaseModel):
    book_id: str
    page_number: int
    note: Optional[str] = ""
    color: str = "#FF1493"
    icon: str = "bookmark"


class DictionaryWord(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    word: str
    definition: str
    synonyms: Optional[List[str]] = []
    language: str = "pt"
    date_added: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class ReadingHistory(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    book_id: str
    page_number: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


# ============ HELPER FUNCTIONS ============

def generate_auto_cover(title: str) -> str:
    """Gera uma capa rosa automática com o título"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Criar imagem rosa
        img = Image.new('RGB', (400, 600), color='#FF1493')
        draw = ImageDraw.Draw(img)
        
        # Adicionar título em branco
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        # Centralizar texto
        text = title[:50]  # Limitar tamanho
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (400 - text_width) // 2
        y = (600 - text_height) // 2
        
        draw.text((x, y), text, fill='white', font=font)
        
        # Converter para base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        logger.error(f"Erro ao gerar capa: {e}")
        return ""


def extract_pdf_metadata(file_content: bytes) -> dict:
    """Extrai metadata de um PDF"""
    try:
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)
        
        metadata = {
            "total_pages": len(reader.pages),
            "title": None,
            "author": None,
        }
        
        if reader.metadata:
            metadata["title"] = reader.metadata.get('/Title', None)
            metadata["author"] = reader.metadata.get('/Author', None)
        
        return metadata
    except Exception as e:
        logger.error(f"Erro ao extrair metadata do PDF: {e}")
        return {"total_pages": 0, "title": None, "author": None}


async def search_open_library(title: str) -> dict:
    """Busca metadados na Open Library API"""
    try:
        url = f"https://openlibrary.org/search.json?title={title}&limit=1"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('docs'):
                book = data['docs'][0]
                return {
                    "title": book.get('title'),
                    "author": book.get('author_name', ['Desconhecido'])[0] if book.get('author_name') else None,
                    "language": book.get('language', ['pt'])[0] if book.get('language') else None,
                }
        return {}
    except Exception as e:
        logger.error(f"Erro ao buscar na Open Library: {e}")
        return {}


# ============ ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "DUDA API - Leitor Offline", "version": "1.0.0"}


# ===== BOOKS =====

@api_router.post("/books", response_model=Book)
async def create_book(book_data: BookCreate):
    """Cria um novo livro no banco"""
    try:
        book_dict = book_data.dict()
        
        # Gerar capa automática se não tiver
        if not book_dict.get('cover_base64'):
            book_dict['cover_base64'] = generate_auto_cover(book_dict['title'])
        
        book_dict['date_added'] = datetime.utcnow()
        book_dict['current_page'] = 0
        book_dict['progress'] = 0.0
        book_dict['status'] = 'novo'
        
        result = await db.books.insert_one(book_dict)
        book_dict['_id'] = str(result.inserted_id)
        
        return Book(**book_dict)
    except Exception as e:
        logger.error(f"Erro ao criar livro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/books", response_model=List[Book])
async def get_books(
    sort_by: str = Query("last_opened", regex="^(last_opened|title|author|progress|date_added)$"),
    filter_status: Optional[str] = Query(None, regex="^(novo|lendo|finalizado|abandonado)$"),
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Lista livros com filtros, ordenação e busca"""
    try:
        query = {}
        
        # Filtro de status
        if filter_status:
            query['status'] = filter_status
        
        # Busca
        if search:
            query['$or'] = [
                {'title': {'$regex': search, '$options': 'i'}},
                {'author': {'$regex': search, '$options': 'i'}},
                {'category': {'$regex': search, '$options': 'i'}},
            ]
        
        # Ordenação
        sort_order = -1 if sort_by in ['last_opened', 'date_added', 'progress'] else 1
        
        books = await db.books.find(query).sort(sort_by, sort_order).skip(skip).limit(limit).to_list(limit)
        
        # Converter ObjectId para string
        for book in books:
            book['_id'] = str(book['_id'])
        
        return [Book(**book) for book in books]
    except Exception as e:
        logger.error(f"Erro ao buscar livros: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/books/{book_id}", response_model=Book)
async def get_book(book_id: str):
    """Busca um livro específico"""
    try:
        book = await db.books.find_one({"_id": ObjectId(book_id)})
        if not book:
            raise HTTPException(status_code=404, detail="Livro não encontrado")
        
        book['_id'] = str(book['_id'])
        return Book(**book)
    except Exception as e:
        logger.error(f"Erro ao buscar livro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/books/{book_id}", response_model=Book)
async def update_book(book_id: str, book_update: BookUpdate):
    """Atualiza um livro"""
    try:
        update_data = {k: v for k, v in book_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
        
        result = await db.books.update_one(
            {"_id": ObjectId(book_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Livro não encontrado")
        
        book = await db.books.find_one({"_id": ObjectId(book_id)})
        book['_id'] = str(book['_id'])
        return Book(**book)
    except Exception as e:
        logger.error(f"Erro ao atualizar livro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str):
    """Deleta um livro e seus bookmarks"""
    try:
        # Deletar bookmarks associados
        await db.bookmarks.delete_many({"book_id": book_id})
        
        # Deletar histórico de leitura
        await db.reading_history.delete_many({"book_id": book_id})
        
        # Deletar livro
        result = await db.books.delete_one({"_id": ObjectId(book_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Livro não encontrado")
        
        return {"message": "Livro deletado com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao deletar livro: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== BOOKMARKS =====

@api_router.post("/bookmarks", response_model=Bookmark)
async def create_bookmark(bookmark_data: BookmarkCreate):
    """Cria um novo marcador"""
    try:
        bookmark_dict = bookmark_data.dict()
        bookmark_dict['date_created'] = datetime.utcnow()
        
        result = await db.bookmarks.insert_one(bookmark_dict)
        bookmark_dict['_id'] = str(result.inserted_id)
        
        return Bookmark(**bookmark_dict)
    except Exception as e:
        logger.error(f"Erro ao criar bookmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bookmarks/{book_id}", response_model=List[Bookmark])
async def get_bookmarks(book_id: str):
    """Lista bookmarks de um livro"""
    try:
        bookmarks = await db.bookmarks.find({"book_id": book_id}).sort("page_number", 1).to_list(1000)
        
        for bookmark in bookmarks:
            bookmark['_id'] = str(bookmark['_id'])
        
        return [Bookmark(**bookmark) for bookmark in bookmarks]
    except Exception as e:
        logger.error(f"Erro ao buscar bookmarks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str):
    """Deleta um marcador"""
    try:
        result = await db.bookmarks.delete_one({"_id": ObjectId(bookmark_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Marcador não encontrado")
        
        return {"message": "Marcador deletado com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao deletar bookmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== DICTIONARY =====

@api_router.get("/dictionary/{word}")
async def get_word_definition(word: str):
    """Busca definição de uma palavra (híbrido offline/online)"""
    try:
        # Primeiro buscar no cache offline
        cached_word = await db.dictionary.find_one({"word": word.lower()})
        
        if cached_word:
            cached_word['_id'] = str(cached_word['_id'])
            return DictionaryWord(**cached_word)
        
        # Se não encontrou, buscar na API pública
        try:
            url = f"https://api-dicionario-ptbr.vercel.app/{word.lower()}"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                # Salvar no cache
                word_data = {
                    "word": word.lower(),
                    "definition": data.get('significado', 'Definição não encontrada'),
                    "synonyms": data.get('sinonimos', []),
                    "language": "pt",
                    "date_added": datetime.utcnow()
                }
                
                result = await db.dictionary.insert_one(word_data)
                word_data['_id'] = str(result.inserted_id)
                
                return DictionaryWord(**word_data)
            else:
                return {"word": word, "definition": "Palavra não encontrada", "synonyms": []}
        except Exception as e:
            logger.error(f"Erro ao buscar na API de dicionário: {e}")
            return {"word": word, "definition": "Erro ao buscar definição", "synonyms": []}
            
    except Exception as e:
        logger.error(f"Erro ao buscar palavra: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== READING HISTORY =====

@api_router.post("/reading-history")
async def add_reading_history(book_id: str, page_number: int):
    """Adiciona entrada no histórico de leitura"""
    try:
        history_data = {
            "book_id": book_id,
            "page_number": page_number,
            "timestamp": datetime.utcnow()
        }
        
        await db.reading_history.insert_one(history_data)
        return {"message": "Histórico atualizado"}
    except Exception as e:
        logger.error(f"Erro ao adicionar histórico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/reading-history/{book_id}")
async def get_reading_history(book_id: str, limit: int = 10):
    """Busca histórico de leitura de um livro"""
    try:
        history = await db.reading_history.find({"book_id": book_id}).sort("timestamp", -1).limit(limit).to_list(limit)
        
        for entry in history:
            entry['_id'] = str(entry['_id'])
        
        return [ReadingHistory(**entry) for entry in history]
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== METADATA SEARCH =====

@api_router.get("/metadata/search")
async def search_metadata(title: str):
    """Busca metadados na Open Library"""
    try:
        result = await search_open_library(title)
        if not result:
            return {"message": "Nenhum resultado encontrado"}
        return result
    except Exception as e:
        logger.error(f"Erro ao buscar metadados: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== STATISTICS (for Developer Mode) =====

@api_router.get("/stats")
async def get_stats():
    """Retorna estatísticas do app"""
    try:
        book_count = await db.books.count_documents({})
        bookmark_count = await db.bookmarks.count_documents({})
        dictionary_count = await db.dictionary.count_documents({})
        
        return {
            "book_count": book_count,
            "bookmark_count": bookmark_count,
            "dictionary_count": dictionary_count,
            "app_version": "1.0.0",
            "database_version": "1.0"
        }
    except Exception as e:
        logger.error(f"Erro ao buscar estatísticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
