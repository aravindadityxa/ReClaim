import random
from datetime import datetime, timedelta
from database import SessionLocal, init_db
from models import (
    Customer, Transaction, RevenueOpportunity,
    TransactionStatus, OpportunityType, OpportunityStatus,
    RiskLevel, Recoverability
)

# Seed random for deterministic results
random.seed(42)


def generate_customers():
    """Generate 15 realistic customers."""
    names = [
        "TechFlow Solutions",
        "CloudSync Enterprise",
        "DataVault Inc",
        "PaymentHub Labs",
        "SwiftPay Systems",
        "NexGen Retail Co",
        "QuantumLeap Digital",
        "EdgeCase Analytics",
        "InnovateMart Ltd",
        "VelocityScale Group",
        "PrecisionTech Corp",
        "StreamAlign Systems",
        "OptimalFlow Inc",
        "MetricsMaster Pro",
        "SecureVault Solutions"
    ]
    
    customers = []
    for i, name in enumerate(names):
        customer = Customer(
            id=f"cust_{i+1:03d}",
            name=name,
            email=f"contact@{name.lower().replace(' ', '')}.com",
            created_at=datetime.utcnow() - timedelta(days=random.randint(30, 365))
        )
        customers.append(customer)
    return customers


def generate_transactions(customers):
    """Generate 130+ transactions with realistic failure patterns."""
    transactions = []
    base_date = datetime.utcnow() - timedelta(days=60)
    
    payment_methods = ["credit_card", "debit_card", "upi", "wallet", "net_banking"]
    failure_reasons = [
        "Insufficient funds",
        "Card declined",
        "Expired card",
        "Invalid OTP",
        "Network timeout",
        "Subscription renewal failed",
        "Customer initiated chargeback",
        "Checkout abandoned",
        "Invoice overdue",
        "Payment gateway timeout"
    ]
    
    transaction_id = 0
    
    # Generate 130 transactions across 60 days
    for day in range(60):
        current_date = base_date + timedelta(days=day)
        
        # 2-4 transactions per day
        daily_txns = random.randint(2, 4)
        
        for _ in range(daily_txns):
            transaction_id += 1
            customer = random.choice(customers)
            
            # 85% success, 15% failure
            is_failed = random.random() < 0.15
            
            amount = random.choice([
                round(random.uniform(100, 500), 2),
                round(random.uniform(500, 2000), 2),
                round(random.uniform(2000, 10000), 2),
                round(random.uniform(100, 50000), 2)
            ])
            
            # Weight towards smaller amounts
            if random.random() < 0.6:
                amount = round(random.uniform(100, 1000), 2)
            
            txn = Transaction(
                id=f"txn_{transaction_id:05d}",
                customer_id=customer.id,
                amount=amount,
                currency="INR",
                status=TransactionStatus.FAILED if is_failed else TransactionStatus.SUCCESS,
                payment_method=random.choice(payment_methods),
                failure_reason=random.choice(failure_reasons) if is_failed else None,
                created_at=current_date + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
            )
            transactions.append(txn)
    
    return transactions


def generate_opportunities(transactions, customers_by_id):
    """Generate revenue opportunities from failed transactions."""
    opportunities = []
    opportunity_id = 0
    
    for txn in transactions:
        if txn.status == TransactionStatus.FAILED:
            opportunity_id += 1
            
            # Map failure reasons to opportunity types and risk levels
            failure_reason = txn.failure_reason or ""
            
            if "Subscription" in failure_reason:
                opp_type = OpportunityType.SUBSCRIPTION_FAILURE
            elif "Checkout" in failure_reason or "abandoned" in failure_reason.lower():
                opp_type = OpportunityType.CHECKOUT_ABANDONMENT
            elif "Invoice" in failure_reason or "overdue" in failure_reason.lower():
                opp_type = OpportunityType.INVOICE_DELAY
            else:
                opp_type = OpportunityType.PAYMENT_FAILURE
            
            # Determine risk level
            days_old = (datetime.utcnow() - txn.created_at).days
            
            if days_old > 30:
                risk = RiskLevel.LOW
            elif days_old > 15:
                risk = RiskLevel.MEDIUM
            elif days_old > 7:
                risk = RiskLevel.HIGH
            else:
                risk = RiskLevel.CRITICAL
            
            # Determine recoverability
            if "Chargeback" in failure_reason or "Insufficient funds" in failure_reason:
                recov = Recoverability.LOW
            elif "Card declined" in failure_reason or "Expired" in failure_reason:
                recov = Recoverability.MEDIUM
            else:
                recov = Recoverability.HIGH
            
            # Determine status
            roll = random.random()
            if roll < 0.05:
                status = OpportunityStatus.RECOVERED
                recovered_at = txn.created_at + timedelta(days=random.randint(1, 20))
            elif roll < 0.15:
                status = OpportunityStatus.LOST
                recovered_at = None
            elif roll < 0.30:
                status = OpportunityStatus.AT_RISK
                recovered_at = None
            else:
                status = OpportunityStatus.RECOVERABLE
                recovered_at = None
            
            due_at = txn.created_at + timedelta(days=random.randint(5, 30)) if opp_type == OpportunityType.INVOICE_DELAY else None
            
            opp = RevenueOpportunity(
                id=f"opp_{opportunity_id:05d}",
                transaction_id=txn.id,
                customer_id=txn.customer_id,
                amount=txn.amount,
                currency=txn.currency,
                type=opp_type,
                status=status,
                risk_level=risk,
                recoverability=recov,
                failure_reason=failure_reason,
                source="transaction_failure",
                created_at=txn.created_at,
                due_at=due_at,
                recovered_at=recovered_at
            )
            opportunities.append(opp)
    
    return opportunities


def seed_database():
    """Initialize and seed the database."""
    init_db()
    db = SessionLocal()
    
    try:
        # Clear existing data
        db.query(RevenueOpportunity).delete()
        db.query(Transaction).delete()
        db.query(Customer).delete()
        db.commit()
        
        # Generate and insert customers
        print("Generating customers...")
        customers = generate_customers()
        db.add_all(customers)
        db.commit()
        
        customers_by_id = {c.id: c for c in customers}
        
        # Generate and insert transactions
        print("Generating transactions...")
        transactions = generate_transactions(customers)
        db.add_all(transactions)
        db.commit()
        
        # Generate and insert opportunities
        print("Generating revenue opportunities...")
        opportunities = generate_opportunities(transactions, customers_by_id)
        db.add_all(opportunities)
        db.commit()
        
        print(f"✓ Seeded {len(customers)} customers")
        print(f"✓ Seeded {len(transactions)} transactions")
        print(f"✓ Seeded {len(opportunities)} revenue opportunities")
        
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
