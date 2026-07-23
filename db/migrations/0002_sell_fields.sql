-- Sell-a-property inquiry detail fields (TWE-132).
-- Captured only when inquiry_type = 'sell'. Nullable so existing rows and
-- non-sell inquiries remain valid.
ALTER TABLE inquiries ADD COLUMN sell_asking_price TEXT;
ALTER TABLE inquiries ADD COLUMN sell_condition    TEXT;
ALTER TABLE inquiries ADD COLUMN sell_walkaway     TEXT;
