#!/usr/bin/env python3
"""
DUDA App Backend API Testing Script
Testa todos os endpoints conforme especificado no test_result.md
"""

import requests
import json
import time
from datetime import datetime
import os
import sys

# Configuração da API
BASE_URL = "https://duda-leitor.preview.emergentagent.com/api"
EXISTING_BOOK_ID = "69a0842b6fda3d244302fb87"  # Livro já criado pelo usuário

# Headers para JSON
HEADERS = {"Content-Type": "application/json"}

class Colors:
    PASS = '\033[92m'
    FAIL = '\033[91m'
    INFO = '\033[94m'
    WARNING = '\033[93m'
    END = '\033[0m'

def log_info(message):
    print(f"{Colors.INFO}[INFO]{Colors.END} {message}")

def log_pass(message):
    print(f"{Colors.PASS}[✅ PASS]{Colors.END} {message}")

def log_fail(message):
    print(f"{Colors.FAIL}[❌ FAIL]{Colors.END} {message}")

def log_warning(message):
    print(f"{Colors.WARNING}[⚠️  WARN]{Colors.END} {message}")

def make_request(method, endpoint, data=None, params=None):
    """Faz uma requisição HTTP e retorna response, success, error_message"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, params=params, headers=HEADERS, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=HEADERS, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=HEADERS, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=HEADERS, timeout=10)
        else:
            return None, False, f"Método HTTP inválido: {method}"
        
        return response, True, None
        
    except requests.exceptions.Timeout:
        return None, False, "Timeout na requisição"
    except requests.exceptions.ConnectionError:
        return None, False, "Erro de conexão"
    except Exception as e:
        return None, False, f"Erro na requisição: {str(e)}"

def test_api_root():
    """Testa GET /api/"""
    log_info("Testando API Root...")
    
    response, success, error = make_request("GET", "/")
    
    if not success:
        log_fail(f"API Root: {error}")
        return False
    
    if response.status_code == 200:
        data = response.json()
        if "message" in data and "version" in data:
            log_pass(f"API Root: {data['message']} v{data['version']}")
            return True
        else:
            log_fail("API Root: Resposta não contém campos esperados")
            return False
    else:
        log_fail(f"API Root: Status {response.status_code}")
        return False

def test_books_get():
    """Testa GET /api/books - verificação básica"""
    log_info("Testando GET /api/books...")
    
    response, success, error = make_request("GET", "/books")
    
    if not success:
        log_fail(f"GET Books: {error}")
        return False
    
    if response.status_code == 200:
        books = response.json()
        if isinstance(books, list):
            log_pass(f"GET Books: {len(books)} livros encontrados")
            return True
        else:
            log_fail("GET Books: Resposta não é uma lista")
            return False
    else:
        log_fail(f"GET Books: Status {response.status_code}")
        return False

def test_create_test_book():
    """Cria um livro de teste para usar nos testes"""
    log_info("Criando livro de teste...")
    
    book_data = {
        "title": "Livro Teste DUDA",
        "author": "Autor Teste",
        "file_type": "pdf", 
        "file_path": "/test/livro-teste.pdf",
        "total_pages": 150,
        "language": "pt",
        "category": "Romance"
    }
    
    response, success, error = make_request("POST", "/books", book_data)
    
    if not success:
        log_fail(f"Criar livro teste: {error}")
        return None
    
    if response.status_code == 200:
        book = response.json()
        book_id = book.get("_id")  # API returns _id not id
        if book_id:
            log_pass(f"Livro teste criado: {book_id}")
            return book_id
        else:
            log_fail("Criar livro teste: ID não retornado")
            return None
    else:
        log_fail(f"Criar livro teste: Status {response.status_code}")
        return None

def test_bookmarks_crud(book_id):
    """Testa CRUD completo de bookmarks"""
    log_info(f"Testando Bookmarks CRUD para livro {book_id}...")
    
    bookmark_ids = []
    
    # 1. CREATE - Criar múltiplos bookmarks
    bookmarks_data = [
        {
            "book_id": book_id,
            "page_number": 10,
            "note": "Capítulo interessante",
            "color": "#FF1493",
            "icon": "bookmark"
        },
        {
            "book_id": book_id,
            "page_number": 25,
            "note": "Ponto importante",
            "color": "#FF69B4", 
            "icon": "star"
        },
        {
            "book_id": book_id,
            "page_number": 50,
            "note": "Para revisar depois",
            "color": "#FFB6C1",
            "icon": "flag"
        }
    ]
    
    log_info("Criando bookmarks...")
    for i, bookmark_data in enumerate(bookmarks_data):
        response, success, error = make_request("POST", "/bookmarks", bookmark_data)
        
        if not success:
            log_fail(f"Criar bookmark {i+1}: {error}")
            continue
        
        if response.status_code == 200:
            bookmark = response.json()
            bookmark_id = bookmark.get("_id")  # API returns _id not id
            if bookmark_id:
                bookmark_ids.append(bookmark_id)
                log_pass(f"Bookmark {i+1} criado: página {bookmark_data['page_number']}")
            else:
                log_fail(f"Criar bookmark {i+1}: ID não retornado")
        else:
            log_fail(f"Criar bookmark {i+1}: Status {response.status_code}")
    
    if len(bookmark_ids) == 0:
        log_fail("Nenhum bookmark foi criado com sucesso")
        return False
    
    # 2. READ - Listar bookmarks do livro
    log_info("Listando bookmarks...")
    response, success, error = make_request("GET", f"/bookmarks/{book_id}")
    
    if not success:
        log_fail(f"Listar bookmarks: {error}")
        return False
    
    if response.status_code == 200:
        bookmarks = response.json()
        if isinstance(bookmarks, list) and len(bookmarks) >= len(bookmark_ids):
            log_pass(f"Bookmarks listados: {len(bookmarks)} encontrados")
            
            # Verificar se estão ordenados por página
            pages = [b.get("page_number", 0) for b in bookmarks]
            if pages == sorted(pages):
                log_pass("Bookmarks ordenados por página corretamente")
            else:
                log_warning("Bookmarks não estão ordenados por página")
        else:
            log_fail("Listar bookmarks: Lista vazia ou incompleta")
            return False
    else:
        log_fail(f"Listar bookmarks: Status {response.status_code}")
        return False
    
    # 3. DELETE - Deletar um bookmark específico
    if bookmark_ids:
        bookmark_to_delete = bookmark_ids[0]
        log_info(f"Deletando bookmark {bookmark_to_delete}...")
        
        response, success, error = make_request("DELETE", f"/bookmarks/{bookmark_to_delete}")
        
        if not success:
            log_fail(f"Deletar bookmark: {error}")
            return False
        
        if response.status_code == 200:
            log_pass("Bookmark deletado com sucesso")
            
            # Verificar se foi realmente deletado
            response, success, error = make_request("GET", f"/bookmarks/{book_id}")
            if success and response.status_code == 200:
                remaining_bookmarks = response.json()
                if len(remaining_bookmarks) == len(bookmark_ids) - 1:
                    log_pass("Bookmark removido da lista corretamente")
                else:
                    log_warning("Bookmark pode não ter sido removido da lista")
        else:
            log_fail(f"Deletar bookmark: Status {response.status_code}")
            return False
    
    return True

def test_books_update(book_id):
    """Testa PUT /api/books/:book_id"""
    log_info(f"Testando atualização de livro {book_id}...")
    
    update_data = {
        "current_page": 75,
        "progress": 50.0,
        "status": "lendo",
        "last_opened": datetime.utcnow().isoformat() + "Z"
    }
    
    response, success, error = make_request("PUT", f"/books/{book_id}", update_data)
    
    if not success:
        log_fail(f"Atualizar livro: {error}")
        return False
    
    if response.status_code == 200:
        book = response.json()
        
        # Verificar se os campos foram atualizados
        if (book.get("current_page") == 75 and 
            book.get("progress") == 50.0 and
            book.get("status") == "lendo"):
            log_pass("Livro atualizado corretamente")
            return True
        else:
            log_fail("Livro não foi atualizado corretamente")
            return False
    else:
        log_fail(f"Atualizar livro: Status {response.status_code}")
        return False

def test_reading_history(book_id):
    """Testa histórico de leitura"""
    log_info(f"Testando histórico de leitura para livro {book_id}...")
    
    # 1. Adicionar entradas no histórico
    history_pages = [5, 12, 18, 25, 33]
    
    log_info("Adicionando entradas no histórico...")
    for page in history_pages:
        params = {"book_id": book_id, "page_number": page}
        response, success, error = make_request("POST", "/reading-history", params=params)
        
        if not success:
            log_fail(f"Adicionar histórico página {page}: {error}")
            continue
        
        if response.status_code == 200:
            log_pass(f"Histórico adicionado: página {page}")
        else:
            log_fail(f"Adicionar histórico página {page}: Status {response.status_code}")
        
        time.sleep(0.1)  # Pequena pausa para diferir timestamps
    
    # 2. Buscar histórico
    log_info("Buscando histórico...")
    params = {"limit": 10}
    response, success, error = make_request("GET", f"/reading-history/{book_id}", params=params)
    
    if not success:
        log_fail(f"Buscar histórico: {error}")
        return False
    
    if response.status_code == 200:
        history = response.json()
        if isinstance(history, list) and len(history) > 0:
            log_pass(f"Histórico encontrado: {len(history)} entradas")
            
            # Verificar se está ordenado por timestamp (mais recente primeiro)
            timestamps = []
            for entry in history:
                if "timestamp" in entry:
                    timestamps.append(entry["timestamp"])
            
            if len(timestamps) > 1:
                # Verificar ordem decrescente
                timestamps_sorted = sorted(timestamps, reverse=True)
                if timestamps == timestamps_sorted:
                    log_pass("Histórico ordenado corretamente (mais recente primeiro)")
                else:
                    log_warning("Histórico pode não estar ordenado corretamente")
            
            return True
        else:
            log_fail("Buscar histórico: Lista vazia")
            return False
    else:
        log_fail(f"Buscar histórico: Status {response.status_code}")
        return False

def test_metadata_search():
    """Testa busca de metadados na Open Library"""
    log_info("Testando busca de metadados...")
    
    # Testar com um título conhecido
    params = {"title": "Dom Casmurro"}
    response, success, error = make_request("GET", "/metadata/search", params=params)
    
    if not success:
        log_fail(f"Buscar metadados: {error}")
        return False
    
    if response.status_code == 200:
        result = response.json()
        if "title" in result or "message" in result:
            if "message" in result and "resultado" in result["message"]:
                log_warning("Metadados: Nenhum resultado encontrado (normal para API externa)")
            else:
                log_pass("Metadados encontrados com sucesso")
            return True
        else:
            log_fail("Buscar metadados: Resposta inválida")
            return False
    else:
        log_fail(f"Buscar metadados: Status {response.status_code}")
        return False

def test_books_delete_cascade(book_id):
    """Testa deleção de livro e cascade (bookmarks + histórico)"""
    log_info(f"Testando deleção em cascata do livro {book_id}...")
    
    # 1. Primeiro verificar se existem bookmarks e histórico
    bookmarks_response, _, _ = make_request("GET", f"/bookmarks/{book_id}")
    history_response, _, _ = make_request("GET", f"/reading-history/{book_id}")
    
    initial_bookmarks = 0
    initial_history = 0
    
    if bookmarks_response and bookmarks_response.status_code == 200:
        initial_bookmarks = len(bookmarks_response.json())
    
    if history_response and history_response.status_code == 200:
        initial_history = len(history_response.json())
    
    log_info(f"Antes da deleção: {initial_bookmarks} bookmarks, {initial_history} histórico")
    
    # 2. Deletar o livro
    response, success, error = make_request("DELETE", f"/books/{book_id}")
    
    if not success:
        log_fail(f"Deletar livro: {error}")
        return False
    
    if response.status_code == 200:
        log_pass("Livro deletado com sucesso")
        
        # 3. Verificar se bookmarks foram deletados
        bookmarks_response, success, error = make_request("GET", f"/bookmarks/{book_id}")
        if success and bookmarks_response.status_code == 200:
            remaining_bookmarks = bookmarks_response.json()
            if len(remaining_bookmarks) == 0:
                log_pass("Bookmarks deletados em cascata")
            else:
                log_fail(f"Bookmarks não foram deletados: {len(remaining_bookmarks)} restantes")
        
        # 4. Verificar se histórico foi deletado
        history_response, success, error = make_request("GET", f"/reading-history/{book_id}")
        if success and history_response.status_code == 200:
            remaining_history = history_response.json()
            if len(remaining_history) == 0:
                log_pass("Histórico deletado em cascata")
            else:
                log_fail(f"Histórico não foi deletado: {len(remaining_history)} restantes")
        
        # 5. Verificar se o livro realmente foi deletado
        book_response, success, error = make_request("GET", f"/books/{book_id}")
        if success and book_response.status_code == 404:
            log_pass("Livro não encontrado após deleção (correto)")
        else:
            log_fail("Livro ainda existe após deleção")
        
        return True
    else:
        log_fail(f"Deletar livro: Status {response.status_code}")
        return False

def test_error_scenarios():
    """Testa cenários de erro (404s, validações)"""
    log_info("Testando cenários de erro...")
    
    # 1. Buscar livro inexistente
    fake_id = "507f1f77bcf86cd799439011"  # ObjectId válido mas inexistente
    response, success, error = make_request("GET", f"/books/{fake_id}")
    
    if success and response.status_code == 404:
        log_pass("Erro 404 para livro inexistente (correto)")
    else:
        log_fail(f"Esperado 404 para livro inexistente, recebido: {response.status_code if response else 'erro'}")
    
    # 2. Deletar bookmark inexistente
    response, success, error = make_request("DELETE", f"/bookmarks/{fake_id}")
    
    if success and response.status_code == 404:
        log_pass("Erro 404 para bookmark inexistente (correto)")
    else:
        log_fail(f"Esperado 404 para bookmark inexistente, recebido: {response.status_code if response else 'erro'}")
    
    # 3. Buscar bookmarks de livro inexistente (deve retornar lista vazia)
    response, success, error = make_request("GET", f"/bookmarks/{fake_id}")
    
    if success and response.status_code == 200:
        bookmarks = response.json()
        if isinstance(bookmarks, list) and len(bookmarks) == 0:
            log_pass("Lista vazia para bookmarks de livro inexistente (correto)")
        else:
            log_fail("Esperado lista vazia para bookmarks de livro inexistente")
    else:
        log_fail(f"Erro ao buscar bookmarks de livro inexistente: {response.status_code if response else 'erro'}")

def test_dictionary_basic():
    """Teste básico do dicionário (já confirmado funcionando)"""
    log_info("Testando dicionário (verificação básica)...")
    
    response, success, error = make_request("GET", "/dictionary/amor")
    
    if not success:
        log_fail(f"Dicionário: {error}")
        return False
    
    if response.status_code == 200:
        result = response.json()
        if "word" in result and "definition" in result:
            log_pass("Dicionário funcionando corretamente")
            return True
        else:
            log_fail("Dicionário: Resposta inválida")
            return False
    else:
        log_fail(f"Dicionário: Status {response.status_code}")
        return False

def test_stats_basic():
    """Teste básico das estatísticas (já confirmado funcionando)"""
    log_info("Testando estatísticas (verificação básica)...")
    
    response, success, error = make_request("GET", "/stats")
    
    if not success:
        log_fail(f"Stats: {error}")
        return False
    
    if response.status_code == 200:
        stats = response.json()
        required_fields = ["book_count", "bookmark_count", "dictionary_count", "app_version"]
        if all(field in stats for field in required_fields):
            log_pass(f"Stats: {stats['book_count']} livros, {stats['bookmark_count']} bookmarks")
            return True
        else:
            log_fail("Stats: Campos obrigatórios ausentes")
            return False
    else:
        log_fail(f"Stats: Status {response.status_code}")
        return False

def main():
    """Executa todos os testes"""
    print("🔍 DUDA App - Teste de Backend APIs")
    print("=" * 50)
    
    results = []
    
    # Testes básicos (já funcionando - verificação rápida)
    results.append(("API Root", test_api_root()))
    results.append(("GET Books", test_books_get()))
    results.append(("Dictionary", test_dictionary_basic()))
    results.append(("Stats", test_stats_basic()))
    
    # Criar livro de teste para os demais testes
    test_book_id = test_create_test_book()
    
    if test_book_id:
        # Testes principais (ALTA PRIORIDADE)
        results.append(("Bookmarks CRUD", test_bookmarks_crud(test_book_id)))
        results.append(("Book Update", test_books_update(test_book_id)))
        
        # Testes médios (MÉDIA PRIORIDADE)
        results.append(("Reading History", test_reading_history(test_book_id)))
        results.append(("Metadata Search", test_metadata_search()))
        
        # Teste de deleção em cascata (deve ser por último)
        results.append(("Delete Cascade", test_books_delete_cascade(test_book_id)))
    else:
        log_fail("Não foi possível criar livro de teste - pulando testes dependentes")
        results.extend([
            ("Bookmarks CRUD", False),
            ("Book Update", False), 
            ("Reading History", False),
            ("Delete Cascade", False)
        ])
    
    # Testes de erro
    results.append(("Error Scenarios", test_error_scenarios()))
    
    # Também testar com o livro existente mencionado pelo usuário
    if EXISTING_BOOK_ID:
        log_info(f"\n🔍 Testando com livro existente: {EXISTING_BOOK_ID}")
        results.append(("Existing Book Bookmarks", test_bookmarks_crud(EXISTING_BOOK_ID)))
        results.append(("Existing Book Update", test_books_update(EXISTING_BOOK_ID)))
        results.append(("Existing Book History", test_reading_history(EXISTING_BOOK_ID)))
    
    # Resumo final
    print("\n" + "=" * 50)
    print("📊 RESUMO DOS TESTES")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<25} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed} passou, {failed} falhou")
    
    if failed > 0:
        print(f"\n{Colors.FAIL}⚠️  Alguns testes falharam - verifique os logs acima{Colors.END}")
        return 1
    else:
        print(f"\n{Colors.PASS}🎉 Todos os testes passaram!{Colors.END}")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)