-- SQL Script to create the target table in Databricks
-- Target Schema: colab
-- Target Table: colabresult

-- Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS colab;

-- Create the target table in Databricks SQL dialect
CREATE TABLE IF NOT EXISTS colab.colabresult (
  Timestamp TIMESTAMP,
  Customer STRING,
  Phone STRING,
  Base STRING,
  Base_Price DOUBLE,
  Pizza STRING,
  Pizza_Price DOUBLE,
  Topping STRING,
  Topping_Price DOUBLE,
  Quantity INT,
  Unit_Price DOUBLE,
  Subtotal DOUBLE,
  Discount DOUBLE,
  GST DOUBLE,
  Total DOUBLE,
  Payment_Mode STRING
)
USING delta; -- Default Delta Lake format on Databricks

-- Optional: Optimize the table for faster querying on Customer or Timestamp
-- OPTIMIZE colab.colabresult ZORDER BY (Timestamp, Customer);
