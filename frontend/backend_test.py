#!/usr/bin/env python3
"""
Backend API Testing for Macelleria Tumminello Order Management System
Tests all API endpoints with authentication and data validation
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class MacelleriaAPITester:
    def __init__(self, base_url="https://meatsystem.preview.emergentagent.com"):
        self.base_url = base_url
        self.banco_token = None
        self.laboratorio_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data.get('detail', 'No error details')}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_seed_data(self):
        """Initialize seed data"""
        print("\n🌱 Testing Seed Data...")
        result = self.run_test("Seed Data", "POST", "seed", 200)
        return result is not None

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test banco login
        banco_result = self.run_test(
            "Banco Login",
            "POST",
            "auth/login",
            200,
            data={"username": "banco", "password": "banco123"}
        )
        
        if banco_result and 'access_token' in banco_result:
            self.banco_token = banco_result['access_token']
            self.log_test("Banco Token Retrieved", True)
        else:
            self.log_test("Banco Token Retrieved", False, "No token in response")

        # Test laboratorio login
        lab_result = self.run_test(
            "Laboratorio Login",
            "POST",
            "auth/login",
            200,
            data={"username": "laboratorio", "password": "lab123"}
        )
        
        if lab_result and 'access_token' in lab_result:
            self.laboratorio_token = lab_result['access_token']
            self.log_test("Laboratorio Token Retrieved", True)
        else:
            self.log_test("Laboratorio Token Retrieved", False, "No token in response")

        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"username": "invalid", "password": "invalid"}
        )

        # Test /auth/me with banco token
        if self.banco_token:
            me_result = self.run_test(
                "Get Current User (Banco)",
                "GET",
                "auth/me",
                200,
                token=self.banco_token
            )
            if me_result and me_result.get('role') == 'banco':
                self.log_test("Banco Role Verification", True)
            else:
                self.log_test("Banco Role Verification", False, f"Expected role 'banco', got {me_result.get('role') if me_result else 'None'}")

        return self.banco_token is not None and self.laboratorio_token is not None

    def test_products_api(self):
        """Test products endpoints"""
        print("\n📦 Testing Products API...")
        
        if not self.banco_token:
            self.log_test("Products API", False, "No banco token available")
            return False

        # Get all products
        products = self.run_test(
            "Get All Products",
            "GET",
            "products",
            200
        )
        
        if not products or not isinstance(products, list):
            self.log_test("Products List Validation", False, "Expected list of products")
            return False
        
        self.log_test("Products List Validation", True, f"Found {len(products)} products")

        # Test category filtering
        bovino_products = self.run_test(
            "Get Bovino Products",
            "GET",
            "products?category=bovino",
            200
        )
        
        if bovino_products:
            bovino_count = len([p for p in bovino_products if p.get('category') == 'bovino'])
            self.log_test("Category Filter", bovino_count > 0, f"Found {bovino_count} bovino products")

        # Test create product
        new_product = {
            "name": "Test Product",
            "category": "altro",
            "description": "Test product for API testing",
            "unit": "kg"
        }
        
        created = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=new_product,
            token=self.banco_token
        )
        
        if created and 'id' in created:
            product_id = created['id']
            self.log_test("Product Creation Validation", True, f"Created product with ID: {product_id}")
            
            # Test delete product
            self.run_test(
                "Delete Product",
                "DELETE",
                f"products/{product_id}",
                200,
                token=self.banco_token
            )
        else:
            self.log_test("Product Creation Validation", False, "No ID in created product")

        return True

    def test_customers_api(self):
        """Test customers endpoints"""
        print("\n👥 Testing Customers API...")
        
        if not self.banco_token:
            self.log_test("Customers API", False, "No banco token available")
            return False

        # Get all customers
        customers = self.run_test(
            "Get All Customers",
            "GET",
            "customers",
            200
        )
        
        if customers is not None:
            self.log_test("Customers List", True, f"Found {len(customers)} customers")
        
        # Test create customer
        new_customer = {
            "name": "Test Customer",
            "phone": "1234567890",
            "notes": "Test customer for API testing"
        }
        
        created = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=new_customer,
            token=self.banco_token
        )
        
        if created and 'id' in created:
            self.log_test("Customer Creation", True, f"Created customer with ID: {created['id']}")
        
        # Test search customers
        search_result = self.run_test(
            "Search Customers",
            "GET",
            "customers?search=Test",
            200
        )
        
        if search_result is not None:
            self.log_test("Customer Search", True, f"Search returned {len(search_result)} results")

        return True

    def test_orders_api(self):
        """Test orders endpoints"""
        print("\n📋 Testing Orders API...")
        
        if not self.banco_token:
            self.log_test("Orders API", False, "No banco token available")
            return False

        # Get all orders
        orders = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200,
            token=self.banco_token
        )
        
        if orders is not None:
            self.log_test("Orders List", True, f"Found {len(orders)} orders")

        # Create test order
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        test_order = {
            "customer_name": "Mario Rossi",
            "customer_phone": "3331234567",
            "items": [
                {
                    "product_id": str(uuid.uuid4()),
                    "product_name": "Bistecca di Scottona",
                    "quantity": 1.5,
                    "unit": "kg",
                    "notes": ""
                }
            ],
            "pickup_date": tomorrow,
            "pickup_time_slot": "mattina",
            "notes": "Test order"
        }
        
        created_order = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=test_order,
            token=self.banco_token
        )
        
        if created_order and 'id' in created_order:
            order_id = created_order['id']
            self.log_test("Order Creation", True, f"Created order with ID: {order_id}")
            
            # Test get single order
            single_order = self.run_test(
                "Get Single Order",
                "GET",
                f"orders/{order_id}",
                200,
                token=self.banco_token
            )
            
            if single_order and single_order.get('status') == 'nuovo':
                self.log_test("Order Status Check", True, "Order created with 'nuovo' status")
            
            # Test update order status
            status_update = {"status": "in_lavorazione"}
            updated_order = self.run_test(
                "Update Order Status",
                "PATCH",
                f"orders/{order_id}/status",
                200,
                data=status_update,
                token=self.laboratorio_token if self.laboratorio_token else self.banco_token
            )
            
            if updated_order and updated_order.get('status') == 'in_lavorazione':
                self.log_test("Status Update Verification", True, "Status updated to 'in_lavorazione'")
            
            # Test order filtering by status
            filtered_orders = self.run_test(
                "Filter Orders by Status",
                "GET",
                "orders?status=in_lavorazione",
                200,
                token=self.banco_token
            )
            
            if filtered_orders is not None:
                matching_orders = [o for o in filtered_orders if o.get('status') == 'in_lavorazione']
                self.log_test("Order Filtering", len(matching_orders) > 0, f"Found {len(matching_orders)} orders in lavorazione")
            
            return order_id
        else:
            self.log_test("Order Creation", False, "Failed to create order")
            return None

    def test_dashboard_api(self):
        """Test dashboard endpoints"""
        print("\n📊 Testing Dashboard API...")
        
        if not self.laboratorio_token:
            self.log_test("Dashboard API", False, "No laboratorio token available")
            return False

        # Test dashboard stats
        stats = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200,
            token=self.laboratorio_token
        )
        
        if stats and 'by_status' in stats:
            expected_statuses = ['nuovo', 'in_lavorazione', 'pronto', 'consegnato']
            has_all_statuses = all(status in stats['by_status'] for status in expected_statuses)
            self.log_test("Dashboard Stats Structure", has_all_statuses, f"Stats: {stats['by_status']}")
        
        # Test new orders count
        new_count = self.run_test(
            "Get New Orders Count",
            "GET",
            "orders/new/count",
            200,
            token=self.laboratorio_token
        )
        
        if new_count and 'count' in new_count:
            self.log_test("New Orders Count", True, f"New orders: {new_count['count']}")

        return True

    def test_api_root(self):
        """Test API root endpoint"""
        print("\n🏠 Testing API Root...")
        
        root_response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        
        if root_response and 'message' in root_response:
            self.log_test("API Root Message", True, root_response['message'])

        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Macelleria Tumminello API Tests")
        print("=" * 50)
        
        # Test sequence
        self.test_api_root()
        self.test_seed_data()
        
        if not self.test_authentication():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        self.test_products_api()
        self.test_customers_api()
        order_id = self.test_orders_api()
        self.test_dashboard_api()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = MacelleriaAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())