/**
 * Test fixtures based on custom Plaid sandbox users
 *
 * Source:
 * - plaid-test-users/1-young-professional.json (5 accounts)
 * - plaid-test-users/4-edge-cases.json (7 accounts)
 *
 * These fixtures match the actual custom users created in Plaid sandbox
 * for realistic end-to-end testing.
 */

import type { AccountBase, Transaction } from "plaid";
import {
  AccountHolderCategory,
  AccountSubtype,
  AccountType,
  TransactionCode,
  TransactionPaymentChannelEnum,
  TransactionTransactionTypeEnum,
} from "plaid";

// ============================================================================
// Young Professional Custom User (1-young-professional.json)
// ============================================================================

/**
 * Checking Account - $3,250.50
 * Has regular income (payroll) and expense transactions
 */
export const youngProfessionalChecking: AccountBase = {
  account_id: "yp-checking-4321",
  balances: {
    available: 3250.5,
    current: 3250.5,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "4321",
  name: "Everyday Checking",
  official_name: "Premium Checking Account",
  subtype: AccountSubtype.Checking,
  type: AccountType.Depository,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Savings Account - $5,000.00
 * Emergency fund with no recent transactions
 */
export const youngProfessionalSavings: AccountBase = {
  account_id: "yp-savings-8765",
  balances: {
    available: 5000.0,
    current: 5000.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "8765",
  name: "Emergency Fund",
  official_name: "High Yield Savings",
  subtype: AccountSubtype.Savings,
  type: AccountType.Depository,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Credit Card - $850.25 balance / $5,000 limit
 * Available: $4,149.75
 */
export const youngProfessionalCreditCard: AccountBase = {
  account_id: "yp-credit-1234",
  balances: {
    available: 4149.75,
    current: 850.25,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: 5000.0,
    last_updated_datetime: null,
  },
  mask: "1234",
  name: "Rewards Credit Card",
  official_name: "Platinum Rewards Card",
  subtype: AccountSubtype.CreditCard,
  type: AccountType.Credit,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Student Loan - $28,500.00 owed
 * No available balance (loan)
 */
export const youngProfessionalStudentLoan: AccountBase = {
  account_id: "yp-loan-5678",
  balances: {
    available: null,
    current: 28500.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "5678",
  name: "Student Loan",
  official_name: "Federal Student Loan",
  subtype: AccountSubtype.Student,
  type: AccountType.Loan,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * 401k - $12,500.00
 * Retirement account with SPY holdings
 */
export const youngProfessional401k: AccountBase = {
  account_id: "yp-401k-9999",
  balances: {
    available: null,
    current: 12500.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "9999",
  name: "Retirement 401k",
  official_name: "401k Savings Plan",
  subtype: AccountSubtype._401k,
  type: AccountType.Investment,
  holder_category: AccountHolderCategory.Personal,
};

// ============================================================================
// Edge Cases Custom User (4-edge-cases.json)
// ============================================================================

/**
 * Overdraft Checking - Negative balance (-$125.50)
 * Tests handling of negative balances
 */
export const edgeCasesOverdraft: AccountBase = {
  account_id: "ec-overdraft-1111",
  balances: {
    available: -125.5,
    current: -125.5,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "1111",
  name: "Overdraft Checking",
  official_name: "Checking Account with Overdraft",
  subtype: AccountSubtype.Checking,
  type: AccountType.Depository,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Empty Savings - Zero balance
 * Tests handling of zero balances
 */
export const edgeCasesEmptySavings: AccountBase = {
  account_id: "ec-empty-0000",
  balances: {
    available: 0.0,
    current: 0.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "0000",
  name: "Empty Savings",
  official_name: "Savings Account - Zero Balance",
  subtype: AccountSubtype.Savings,
  type: AccountType.Depository,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Maxed Credit Card - $9,950 / $10,000 limit
 * Only $50 available - tests near-limit scenario
 */
export const edgeCasesMaxedCredit: AccountBase = {
  account_id: "ec-maxed-9999",
  balances: {
    available: 50.0,
    current: 9950.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: 10000.0,
    last_updated_datetime: null,
  },
  mask: "9999",
  name: "Maxed Out Card",
  official_name: "Credit Card - Near Limit",
  subtype: AccountSubtype.CreditCard,
  type: AccountType.Credit,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * No Available Balance - $250 current, null available
 * Tests handling of missing available balance
 */
export const edgeCasesNoAvailableBalance: AccountBase = {
  account_id: "ec-noavail-2222",
  balances: {
    available: null,
    current: 250.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "2222",
  name: "No Available Balance",
  official_name: "Checking with Pending Holds",
  subtype: AccountSubtype.Checking,
  type: AccountType.Depository,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Paid Off Loan - $0 balance
 * Tests handling of fully paid loans
 */
export const edgeCasesPaidOffLoan: AccountBase = {
  account_id: "ec-paidoff-0001",
  balances: {
    available: null,
    current: 0.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "0001",
  name: "Paid Off Loan",
  official_name: "Student Loan - Paid in Full",
  subtype: AccountSubtype.Student,
  type: AccountType.Loan,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * New 401k - $125.00
 * Tests handling of small balances in investment accounts
 */
export const edgeCasesNew401k: AccountBase = {
  account_id: "ec-new401k-0101",
  balances: {
    available: null,
    current: 125.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "0101",
  name: "New 401k",
  official_name: "401k - Recently Opened",
  subtype: AccountSubtype._401k,
  type: AccountType.Investment,
  holder_category: AccountHolderCategory.Personal,
};

/**
 * Locked CD - $10,000 balance, $0 available
 * Tests handling of illiquid accounts (CDs)
 */
export const edgeCasesLockedCD: AccountBase = {
  account_id: "ec-cd-5000",
  balances: {
    available: 0.0,
    current: 10000.0,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    limit: null,
    last_updated_datetime: null,
  },
  mask: "5000",
  name: "Locked CD",
  official_name: "Certificate of Deposit - 1 Year",
  subtype: AccountSubtype.Cd,
  type: AccountType.Depository,
  holder_category: AccountHolderCategory.Personal,
};

// ============================================================================
// Transaction Fixtures (from custom user transactions)
// ============================================================================

/**
 * Payroll Deposit - Negative amount means money IN
 */
export const transactionPayrollDeposit: Transaction = {
  transaction_id: "txn-payroll-001",
  account_id: "yp-checking-4321",
  amount: -2500.0,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
  category: ["Income", "Payroll"],
  category_id: "21001000",
  date: "2025-11-01",
  authorized_date: "2025-11-01",
  authorized_datetime: null,
  datetime: null,
  location: {
    address: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    lat: null,
    lon: null,
    store_number: null,
  },
  name: "Payroll Deposit - ACME Corp",
  merchant_name: "ACME Corporation",
  payment_meta: {
    by_order_of: null,
    payee: null,
    payer: null,
    payment_method: null,
    payment_processor: null,
    reason: null,
    reference_number: null,
    ppd_id: null,
  },
  pending: false,
  pending_transaction_id: null,
  account_owner: null,
  payment_channel: TransactionPaymentChannelEnum.Other,
  transaction_code: TransactionCode.Purchase,
  personal_finance_category: null,
  personal_finance_category_icon_url: "",
  transaction_type: TransactionTransactionTypeEnum.Special,
  counterparties: [],
  merchant_entity_id: null,
  check_number: null,
  original_description: null,
};

/**
 * Grocery Store Purchase - Positive amount means money OUT
 */
export const transactionGroceryStore: Transaction = {
  transaction_id: "txn-grocery-001",
  account_id: "yp-checking-4321",
  amount: 85.32,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
  category: ["Shops", "Food and Beverage Store"],
  category_id: "19046000",
  date: "2025-10-28",
  authorized_date: "2025-10-28",
  authorized_datetime: null,
  datetime: null,
  location: {
    address: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    lat: null,
    lon: null,
    store_number: null,
  },
  name: "Grocery Store",
  merchant_name: "Local Grocery",
  payment_meta: {
    by_order_of: null,
    payee: null,
    payer: null,
    payment_method: null,
    payment_processor: null,
    reason: null,
    reference_number: null,
    ppd_id: null,
  },
  pending: false,
  pending_transaction_id: null,
  account_owner: null,
  payment_channel: TransactionPaymentChannelEnum.InStore,
  transaction_code: TransactionCode.Purchase,
  personal_finance_category: null,
  personal_finance_category_icon_url: "",
  transaction_type: TransactionTransactionTypeEnum.Place,
  counterparties: [],
  merchant_entity_id: null,
  check_number: null,
  original_description: null,
};

/**
 * Rent Payment
 */
export const transactionRentPayment: Transaction = {
  transaction_id: "txn-rent-001",
  account_id: "yp-checking-4321",
  amount: 1200.0,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
  category: ["Payment", "Rent"],
  category_id: "16001000",
  date: "2025-10-10",
  authorized_date: "2025-10-10",
  authorized_datetime: null,
  datetime: null,
  location: {
    address: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    lat: null,
    lon: null,
    store_number: null,
  },
  name: "Rent Payment",
  merchant_name: null,
  payment_meta: {
    by_order_of: null,
    payee: null,
    payer: null,
    payment_method: null,
    payment_processor: null,
    reason: null,
    reference_number: null,
    ppd_id: null,
  },
  pending: false,
  pending_transaction_id: null,
  account_owner: null,
  payment_channel: TransactionPaymentChannelEnum.Online,
  transaction_code: TransactionCode.Purchase,
  personal_finance_category: null,
  personal_finance_category_icon_url: "",
  transaction_type: TransactionTransactionTypeEnum.Special,
  counterparties: [],
  merchant_entity_id: null,
  check_number: null,
  original_description: null,
};

/**
 * Credit Card Payment - Negative on credit means payment received
 */
export const transactionCreditCardPayment: Transaction = {
  transaction_id: "txn-cc-payment-001",
  account_id: "yp-credit-1234",
  amount: -500.0,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
  category: ["Payment"],
  category_id: "16000000",
  date: "2025-10-25",
  authorized_date: "2025-10-25",
  authorized_datetime: null,
  datetime: null,
  location: {
    address: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    lat: null,
    lon: null,
    store_number: null,
  },
  name: "Payment - Thank You",
  merchant_name: null,
  payment_meta: {
    by_order_of: null,
    payee: null,
    payer: null,
    payment_method: null,
    payment_processor: null,
    reason: null,
    reference_number: null,
    ppd_id: null,
  },
  pending: false,
  pending_transaction_id: null,
  account_owner: null,
  payment_channel: TransactionPaymentChannelEnum.Online,
  transaction_code: TransactionCode.Purchase,
  personal_finance_category: null,
  personal_finance_category_icon_url: "",
  transaction_type: TransactionTransactionTypeEnum.Special,
  counterparties: [],
  merchant_entity_id: null,
  check_number: null,
  original_description: null,
};

/**
 * Overdraft Fee - Edge case transaction
 */
export const transactionOverdraftFee: Transaction = {
  transaction_id: "txn-overdraft-001",
  account_id: "ec-overdraft-1111",
  amount: 35.0,
  iso_currency_code: "USD",
  unofficial_currency_code: null,
  category: ["Bank Fees", "Overdraft"],
  category_id: "15000010",
  date: "2025-11-05",
  authorized_date: "2025-11-05",
  authorized_datetime: null,
  datetime: null,
  location: {
    address: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    lat: null,
    lon: null,
    store_number: null,
  },
  name: "Overdraft Fee",
  merchant_name: null,
  payment_meta: {
    by_order_of: null,
    payee: null,
    payer: null,
    payment_method: null,
    payment_processor: null,
    reason: null,
    reference_number: null,
    ppd_id: null,
  },
  pending: false,
  pending_transaction_id: null,
  account_owner: null,
  payment_channel: TransactionPaymentChannelEnum.Other,
  transaction_code: TransactionCode.Purchase,
  personal_finance_category: null,
  personal_finance_category_icon_url: "",
  transaction_type: TransactionTransactionTypeEnum.Special,
  counterparties: [],
  merchant_entity_id: null,
  check_number: null,
  original_description: null,
};

// ============================================================================
// Convenience Exports
// ============================================================================

export const allYoungProfessionalAccounts = [
  youngProfessionalChecking,
  youngProfessionalSavings,
  youngProfessionalCreditCard,
  youngProfessionalStudentLoan,
  youngProfessional401k,
];

export const allEdgeCaseAccounts = [
  edgeCasesOverdraft,
  edgeCasesEmptySavings,
  edgeCasesMaxedCredit,
  edgeCasesNoAvailableBalance,
  edgeCasesPaidOffLoan,
  edgeCasesNew401k,
  edgeCasesLockedCD,
];

export const allCustomUserAccounts = [...allYoungProfessionalAccounts, ...allEdgeCaseAccounts];

export const allCustomUserTransactions = [
  transactionPayrollDeposit,
  transactionGroceryStore,
  transactionRentPayment,
  transactionCreditCardPayment,
  transactionOverdraftFee,
];
