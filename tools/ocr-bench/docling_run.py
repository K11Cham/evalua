import sys
from docling.document_converter import DocumentConverter
conv = DocumentConverter()
res = conv.convert(sys.argv[1])
sys.stdout.reconfigure(encoding='utf-8')
print(res.document.export_to_markdown())
