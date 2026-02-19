from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, asc, desc

from .. import models, schemas, database, dependencies

router = APIRouter(prefix="/api/employees", tags=["Employees"])

EMPLOYEE_CACHE = {}

@router.get("/")
async def get_employees(
    page: int = 1, 
    limit: int = 5, 
    search: str = "",
    sort_by: str = "id",
    sort_order: str = "asc",
    user: dict = Depends(dependencies.get_current_user), 
    db: AsyncSession = Depends(database.get_db)
):
    cache_key = f"employees:page={page}:limit={limit}:search={search}:sort={sort_by}:order={sort_order}"
    if cache_key in EMPLOYEE_CACHE:
        print(f"⚡ Cache hit: {cache_key}")
        return EMPLOYEE_CACHE[cache_key]

    print(f"DB query: {cache_key}")
    offset = (page - 1) * limit
    query = select(models.Employee)
    
    if search:
        query = query.where(models.Employee.name.ilike(f"%{search}%"))

    sort_column = getattr(models.Employee, sort_by, models.Employee.id)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
        
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    employees = result.scalars().all()

    count_query = select(func.count(models.Employee.id))
    if search:
        count_query = count_query.where(models.Employee.name.ilike(f"%{search}%"))
        
    count_res = await db.execute(count_query)
    total_count = count_res.scalar()

    response_data = {
        "data": employees,
        "total": total_count,
        "page": page,
        "limit": limit
    }
    
    EMPLOYEE_CACHE[cache_key] = response_data
    return response_data

@router.post("/")
async def create_employee(
    emp: schemas.EmployeeCreate,
    admin: models.User = Depends(dependencies.get_current_admin), 
    db: AsyncSession = Depends(database.get_db)
):
    new_emp = models.Employee(**emp.dict())
    db.add(new_emp)
    await db.commit()
    
    EMPLOYEE_CACHE.clear()
    print(" Employee cache cleared.")
    return {"message": "Employee created"}

@router.delete("/{emp_id}")
async def delete_employee(
    emp_id: int,
    admin: models.User = Depends(dependencies.get_current_admin), 
    db: AsyncSession = Depends(database.get_db)
):
    stmt = select(models.Employee).where(models.Employee.id == emp_id)
    result = await db.execute(stmt)
    emp = result.scalars().first()
    
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    await db.delete(emp)
    await db.commit()
    
    EMPLOYEE_CACHE.clear()
    print(" Employee cache cleared.")
    return {"message": "Employee deleted"}