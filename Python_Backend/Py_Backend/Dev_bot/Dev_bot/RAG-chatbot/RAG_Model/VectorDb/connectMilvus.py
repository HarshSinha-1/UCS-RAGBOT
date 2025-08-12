import numpy as np
from pymilvus import (
    connections, FieldSchema, CollectionSchema,
    DataType, Collection
)
from pymilvus import utility

try:
    connections.connect(
        alias="default",
        host="milvus.upvoteconsulting.com",  # Your subdomain
        port=9007,
        secure=False,
        channel_options=[
        # -1 means “unlimited”, or you can pick a byte-size like 100*1024*1024
          ("grpc.max_send_message_length", 100 * 1024 * 1024),
         ("grpc.max_receive_message_length", 100 * 1024 * 1024),
        ]
    )
    """
    Connect to remote Milvus instance and get or create the collection for document embeddings.
    Returns the collection or raises the original error with traceback.
    """
   
    print(f"✅ Connected to Milvus ")

    # utility.drop_collection("rag_chunks")
    # print("ℹ️ Dropped existing collection 'rag_chunks' if it existed.")


        # 2. Define schema
    fields = [
          FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, auto_id=False, max_length=36),
          FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),  # Adjust dim if needed
          FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
          FieldSchema(name="doc_name", dtype=DataType.VARCHAR,max_length=255),
          FieldSchema(name="doc_id", dtype=DataType.VARCHAR, max_length=64),  # Important: searchable filter
          FieldSchema(name="chunk_index", dtype=DataType.INT64, is_primary=False),
          FieldSchema(name="page", dtype=DataType.INT64, is_primary=False),
         ]

         # Create the collection schema
    schema = CollectionSchema(
          fields=fields,
          description="Chunks of documents for RAG retrieval"
       )

        # Create the collection
    collection = Collection(
           name="rag_chunks1",
           schema=schema
        )
    
    if not collection.has_index():
            index_params = {
                "index_type": "IVF_FLAT",
                "metric_type": "COSINE",
                "params": {"M": 16, "efConstruction": 200}
            }
            collection.create_index(field_name="embedding", index_params=index_params)
            print("✅ Created index on 'embedding'")
    else:
            print("ℹ️ Index on 'embedding' already exists.")

    collection.load()
    print("✅ Collection 'rag_chunks1' is ready for use.")
    
except Exception as e:  
    print("\n❌ Milvus Connection or Collection Setup Failed!")
    print(f"🔍 Error Message: {str(e)}")
    raise  # Re-raise to propagate the error if needed


