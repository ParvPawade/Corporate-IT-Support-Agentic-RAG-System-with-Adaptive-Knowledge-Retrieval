from app.services.injestion import load_file, chunk_documents
from pathlib import Path

docs=load_file(Path("data/sample_Kb_data/company_handbook.md"))
docs=chunk_documents(docs)

print(docs)