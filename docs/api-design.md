# API Design (Express REST)

Base URL: `/api`
Auth: `Authorization: Bearer <JWT>`

## Auth
- `POST /auth/register`
- `POST /auth/login`

## Dashboard & Analytics
- `GET /dashboard`
- `GET /analytics/overview`

## Master Data
- `GET/POST/PUT/DELETE /categories`
- `GET/POST/PUT/DELETE /products`
- `GET/POST/PUT/DELETE /suppliers`
- `GET/POST/PUT/DELETE /customers`

## Transactions
- `GET/POST /purchases`
- `GET/POST /sales`
- `GET/POST /expenses`

## Reports
- `GET /reports/sales.csv`
- `GET /reports/inventory.xlsx`
- `GET /reports/summary.pdf`

## Example Payloads

### Create Product
```json
{
  "code": "ANU-SILK-100",
  "barcode": "890001001001",
  "name": "Soft Silk Saree",
  "categoryId": "cat_id",
  "supplierId": "sup_id",
  "purchasePrice": 2300,
  "sellingPrice": 3499,
  "mrp": 3999,
  "color": "Teal",
  "size": "Free Size",
  "material": "Silk",
  "quantity": 10,
  "notes": "Festival collection"
}
```

### Record Sale
```json
{
  "saleDate": "2026-06-09T08:45:00.000Z",
  "paymentMethod": "UPI",
  "discount": 100,
  "gst": 0,
  "items": [
    {
      "productId": "prod_id",
      "quantity": 1,
      "unitPrice": 3499
    }
  ]
}
```
