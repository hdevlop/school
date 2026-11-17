-- The school's grid has five levels, from مؤشرات غياب الاكتساب (not acquired)
-- to اكتساب متأكد; Non évalué stays the absence of a row. The new lowest
-- level goes first so the enum's order is the grid's. Additive: no stored
-- level changes meaning.
ALTER TYPE "public"."competencyLevel" ADD VALUE 'not_acquired' BEFORE 'beginning';
