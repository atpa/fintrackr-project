#!/usr/bin/env python3
"""
Скрипт для удаления кнопок sidebar-toggle из всех HTML файлов
"""

import os
import re
import glob

def remove_toggle_button(file_path):
    """Удаляет кнопку toggle из HTML файла"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Паттерн для поиска кнопки toggle с любым количеством атрибутов
        pattern = r'<button[^>]*class="[^"]*sidebar-toggle-btn[^"]*"[^>]*>.*?</button>'
        
        # Удаляем кнопку
        new_content = re.sub(pattern, '', content, flags=re.DOTALL)
        
        # Если содержимое изменилось, записываем обратно
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✅ Удалена кнопка toggle из: {file_path}")
            return True
        else:
            print(f"ℹ️  Кнопка toggle не найдена в: {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при обработке {file_path}: {e}")
        return False

def main():
    """Основная функция"""
    # Найдем все HTML файлы в директории public
    html_files = glob.glob("public/*.html")
    
    print(f"Найдено {len(html_files)} HTML файлов для проверки...")
    
    modified_count = 0
    for file_path in html_files:
        if remove_toggle_button(file_path):
            modified_count += 1
    
    print(f"\n📋 Обработка завершена!")
    print(f"📝 Изменено файлов: {modified_count}")
    print(f"📄 Всего проверено: {len(html_files)}")

if __name__ == "__main__":
    main()