from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'macelleria-tumminello-secret-key-2024')
JWT_ALGORITHM = "HS256"

# Create the main app
app = FastAPI()

origins = os.environ.get("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://meatsystem-79b63.web.app",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class UserBase(BaseModel):
    username: str
    role: str  # "banco" or "laboratorio"

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProductBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = ""
    unit: str = "kg"  # kg, pz (pezzi), porzione
    price: Optional[float] = None  # prezzo al kg/pz

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None

class ProductResponse(ProductBase):
    id: str

class CategoryBase(BaseModel):
    name: str
    label: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str

class CustomerBase(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = ""

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: str
    created_at: str

class OrderItemBase(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit: str
    notes: Optional[str] = ""

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    items: List[OrderItemBase]
    pickup_date: str  # YYYY-MM-DD
    pickup_time_slot: str  # "mattina", "pomeriggio", fascia oraria
    notes: Optional[str] = ""

class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: Optional[List[OrderItemBase]] = None
    pickup_date: Optional[str] = None
    pickup_time_slot: Optional[str] = None
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str  # "nuovo", "in_lavorazione", "pronto", "parzialmente_ritirato", "ritirato", "consegnato"

class OrderModification(BaseModel):
    date: str
    description: str
    modified_by: str

class OrderResponse(BaseModel):
    id: str
    order_number: Optional[str] = None
    customer_name: str
    customer_phone: str
    items: List[OrderItemBase]
    pickup_date: str
    pickup_time_slot: str
    status: str
    notes: str
    created_at: str
    created_by: str
    updated_at: Optional[str] = None
    modifications: Optional[List[dict]] = []


    # ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token non valido")


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username già esistente")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user.username,
        "password_hash": hash_password(user.password),
        "role": user.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    return UserResponse(id=user_id, username=user.username, role=user.role)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    token = create_token(user["id"], user["username"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user["id"], username=user["username"], role=user["role"])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["sub"],
        username=current_user["username"],
        role=current_user["role"]
    )

# ==================== PRODUCTS ROUTES ====================

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(category: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).to_list(500)
    return products

@api_router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        **product.model_dump()
    }
    await db.products.insert_one(product_doc)
    return ProductResponse(id=product_id, **product.model_dump())

@api_router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_update: ProductUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    
    update_data = {k: v for k, v in product_update.model_dump().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return ProductResponse(**updated)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return {"message": "Prodotto eliminato"}

# ==================== CATEGORIES ROUTES ====================

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    # Check if category name already exists
    existing = await db.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="Categoria già esistente")
    
    category_id = str(uuid.uuid4())
    category_doc = {
        "id": category_id,
        **category.model_dump()
    }
    await db.categories.insert_one(category_doc)
    return CategoryResponse(id=category_id, **category.model_dump())

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    
    await db.categories.update_one({"id": category_id}, {"$set": category.model_dump()})
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return CategoryResponse(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    # Check if category is in use
    category = await db.categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    
    products_count = await db.products.count_documents({"category": category["name"]})
    if products_count > 0:
        raise HTTPException(status_code=400, detail=f"Impossibile eliminare: {products_count} prodotti usano questa categoria")
    
    await db.categories.delete_one({"id": category_id})
    return {"message": "Categoria eliminata"}

# ==================== CUSTOMERS ROUTES ====================

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return customers

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        **customer.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    return CustomerResponse(id=customer_id, created_at=customer_doc["created_at"], **customer.model_dump())

# ==================== ORDERS ROUTES ====================

@api_router.get("/orders/unacknowledged")
async def get_unacknowledged_orders(current_user: dict = Depends(get_current_user)):
    """Get all orders that haven't been acknowledged yet"""
    orders = await db.orders.find(
        {"acknowledged": {"$ne": True}, "status": "nuovo"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Ensure all datetime fields are strings
    for order in orders:
        if order.get("created_at") and not isinstance(order["created_at"], str):
            order["created_at"] = order["created_at"].isoformat()
        if order.get("updated_at") and not isinstance(order["updated_at"], str):
            order["updated_at"] = order["updated_at"].isoformat()
    
    return orders

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    pickup_date: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if pickup_date:
        query["pickup_date"] = pickup_date
    if status:
        query["status"] = status
    if from_date and to_date:
        query["pickup_date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["pickup_date"] = {"$gte": from_date}
    elif to_date:
        query["pickup_date"] = {"$lte": to_date}
    
    orders = await db.orders.find(query, {"_id": 0}).sort([("pickup_date", 1), ("pickup_time_slot", 1), ("created_at", 1)]).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return order

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, current_user: dict = Depends(get_current_user)):
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    # Generate order number: NUM/YEAR
    year = now.year
    # Count orders in current year
    year_start = f"{year}-01-01"
    year_end = f"{year}-12-31"
    count = await db.orders.count_documents({
        "created_at": {"$gte": year_start, "$lte": year_end + "T23:59:59"}
    })
    order_number = f"{count + 1}/{year}"
    
    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "items": [item.model_dump() for item in order.items],
        "pickup_date": order.pickup_date,
        "pickup_time_slot": order.pickup_time_slot,
        "status": "nuovo",
        "notes": order.notes or "",
        "created_at": now_iso,
        "created_by": current_user["username"],
        "updated_at": None,
        "modifications": []
    }
    await db.orders.insert_one(order_doc)
    
    # Also save/update customer
    existing_customer = await db.customers.find_one({"phone": order.customer_phone})
    if not existing_customer:
        await db.customers.insert_one({
            "id": str(uuid.uuid4()),
            "name": order.customer_name,
            "phone": order.customer_phone,
            "notes": "",
            "created_at": now
        })
    
    return OrderResponse(**order_doc)

@api_router.put("/orders/{order_id}", response_model=OrderResponse)
async def update_order(order_id: str, order_update: OrderUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.orders.find_one({"id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    update_data = {k: v for k, v in order_update.model_dump().items() if v is not None}
    
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    
    # Track which items are new (added after original order)
    if "items" in update_data:
        existing_items = existing.get("items", [])
        existing_product_ids = {item.get("product_id") for item in existing_items}
        
        new_items = []
        for item in update_data["items"]:
            item_data = item.model_dump() if hasattr(item, 'model_dump') else item
            # Check if this is a new product added to the order
            if item_data.get("product_id") not in existing_product_ids:
                item_data["is_new"] = True
                item_data["added_at"] = now
            else:
                # Preserve the is_new flag from existing item if it was already marked
                for existing_item in existing_items:
                    if existing_item.get("product_id") == item_data.get("product_id"):
                        if existing_item.get("is_new"):
                            item_data["is_new"] = True
                            item_data["added_at"] = existing_item.get("added_at")
                        break
            new_items.append(item_data)
        update_data["items"] = new_items
    
    # Aggiungi alla lista delle modifiche
    modification = {
        "date": now,
        "description": "Ordine modificato",
        "modified_by": current_user["username"]
    }
    
    # Prepara la descrizione della modifica
    changes = []
    if "items" in update_data:
        # Count how many new items were added
        new_count = sum(1 for item in update_data["items"] if item.get("is_new") and item.get("added_at") == now)
        if new_count > 0:
            changes.append(f"{new_count} prodott{'o' if new_count == 1 else 'i'} aggiunt{'o' if new_count == 1 else 'i'}")
        else:
            changes.append("prodotti aggiornati")
    if "pickup_date" in update_data:
        changes.append(f"data ritiro: {update_data['pickup_date']}")
    if "pickup_time_slot" in update_data:
        changes.append(f"orario: {update_data['pickup_time_slot']}")
    if "notes" in update_data:
        changes.append("note aggiornate")
    
    if changes:
        modification["description"] = ", ".join(changes).capitalize()
    
    await db.orders.update_one(
        {"id": order_id}, 
        {
            "$set": update_data,
            "$push": {"modifications": modification}
        }
    )
    
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return OrderResponse(**updated)

@api_router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["nuovo", "in_lavorazione", "pronto", "parzialmente_ritirato", "ritirato", "consegnato"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Stato non valido. Stati validi: {valid_statuses}")
    
    existing = await db.orders.find_one({"id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status_update.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return OrderResponse(**updated)

@api_router.patch("/orders/{order_id}/acknowledge")
async def acknowledge_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Mark an order as acknowledged (presa visione)"""
    existing = await db.orders.find_one({"id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "acknowledged": True,
            "acknowledged_at": datetime.now(timezone.utc).isoformat(),
            "acknowledged_by": current_user["username"]
        }}
    )
    
    return {"message": "Ordine confermato", "order_id": order_id}

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return {"message": "Ordine eliminato"}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Count orders by status for today
    pipeline = [
        {"$match": {"pickup_date": today}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.orders.aggregate(pipeline).to_list(10)
    
    stats = {
        "nuovo": 0,
        "in_lavorazione": 0,
        "pronto": 0,
        "consegnato": 0
    }
    for item in status_counts:
        if item["_id"] in stats:
            stats[item["_id"]] = item["count"]
    
    # Total orders today
    total_today = sum(stats.values())
    
    # Count new orders (for notification badge)
    new_orders_count = await db.orders.count_documents({"status": "nuovo"})
    
    return {
        "today": today,
        "total_today": total_today,
        "by_status": stats,
        "new_orders_count": new_orders_count
    }

@api_router.get("/orders/new/count")
async def get_new_orders_count(current_user: dict = Depends(get_current_user)):
    count = await db.orders.count_documents({"status": "nuovo"})
    return {"count": count}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    try:
        existing_products = await db.products.count_documents({})
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Database non raggiungibile"
        )

    if existing_products > 0:
        return {"message": "Dati già presenti"}
    
    # Seed categories
    categories = [
        {"id": str(uuid.uuid4()), "name": "bovino", "label": "Bovino"},
        {"id": str(uuid.uuid4()), "name": "suino", "label": "Suino"},
        {"id": str(uuid.uuid4()), "name": "preparati", "label": "Preparati"},
        {"id": str(uuid.uuid4()), "name": "altro", "label": "Altro"},
    ]
    existing_categories = await db.categories.count_documents({})
    if existing_categories == 0:
        await db.categories.insert_many(categories)
    
    # Seed products
    products = [
        # Bovino
        {"id": str(uuid.uuid4()), "name": "Arrosto di Vitello", "category": "bovino", "description": "Arrosto classico di vitello", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Bistecca di Scottona", "category": "bovino", "description": "Scottona di razza pregiata", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Tagliata di Scottona", "category": "bovino", "description": "Tagliata di scottona Tumminello", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Costata di Scottona", "category": "bovino", "description": "Costata con osso", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Fettine di Vitello", "category": "bovino", "description": "Fettine per scaloppine", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Macinato di Bovino", "category": "bovino", "description": "Carne macinata fresca", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Spezzatino di Bovino", "category": "bovino", "description": "Per stufati e spezzatini", "unit": "kg", "price": None},
        # Suino
        {"id": str(uuid.uuid4()), "name": "Arrosto di Maiale", "category": "suino", "description": "Arrosto classico di maiale", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Costine di Maiale", "category": "suino", "description": "Costine per grigliata", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Braciole di Maiale", "category": "suino", "description": "Braciole con osso", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Salsiccia Fresca", "category": "suino", "description": "Salsiccia artigianale", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Salsiccia Pasqualora", "category": "suino", "description": "Specialità siciliana", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Porchetta Artigianale", "category": "suino", "description": "Porchetta fatta in casa", "unit": "kg", "price": None},
        # Preparati
        {"id": str(uuid.uuid4()), "name": "Involtini di Carne", "category": "preparati", "description": "Involtini ripieni", "unit": "pz", "price": None},
        {"id": str(uuid.uuid4()), "name": "Polpette", "category": "preparati", "description": "Polpette pronte da cuocere", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Hamburger", "category": "preparati", "description": "Hamburger artigianali", "unit": "pz", "price": None},
        {"id": str(uuid.uuid4()), "name": "Spiedini Misti", "category": "preparati", "description": "Spiedini di carne mista", "unit": "pz", "price": None},
        {"id": str(uuid.uuid4()), "name": "Tramezzini con Mozzarella", "category": "preparati", "description": "Tramezzini ripieni", "unit": "pz", "price": None},
        {"id": str(uuid.uuid4()), "name": "Cotolette Impanate", "category": "preparati", "description": "Cotolette pronte da friggere", "unit": "pz", "price": None},
        # Altro
        {"id": str(uuid.uuid4()), "name": "Pollo Intero", "category": "altro", "description": "Pollo ruspante", "unit": "pz", "price": None},
        {"id": str(uuid.uuid4()), "name": "Petto di Pollo", "category": "altro", "description": "Petto di pollo fresco", "unit": "kg", "price": None},
        {"id": str(uuid.uuid4()), "name": "Coniglio", "category": "altro", "description": "Coniglio intero", "unit": "pz", "price": None},
    ]
    await db.products.insert_many(products)
    
    # Seed default users
    users = [
        {
            "id": str(uuid.uuid4()),
            "username": "banco",
            "password_hash": hash_password("banco123"),
            "role": "banco",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "username": "laboratorio",
            "password_hash": hash_password("lab123"),
            "role": "laboratorio",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for user in users:
        existing = await db.users.find_one({"username": user["username"]})
        if not existing:
            await db.users.insert_one(user)
    
    return {"message": "Dati di esempio creati con successo", "users": ["banco/banco123", "laboratorio/lab123"]}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Macelleria Tumminello API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
