-- Add vector operations support to PostgreSQL for better embedding search

-- Check if the vector_ops extension exists before attempting to create it
DO $$ 
BEGIN
    -- Add <=> operator (cosine distance) for JSONB arrays if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_operator WHERE oprname = '<=>' AND 
        oprleft = 'jsonb'::regtype AND oprright = 'jsonb'::regtype
    ) THEN
        -- Create a function to calculate cosine distance between two JSONB arrays
        CREATE OR REPLACE FUNCTION cosine_distance(a jsonb, b jsonb)
        RETURNS float
        LANGUAGE plpgsql
        IMMUTABLE
        AS $$
        DECLARE
            dot_product float := 0;
            norm_a float := 0;
            norm_b float := 0;
            a_values float[];
            b_values float[];
            i int;
        BEGIN
            -- Convert JSONB arrays to float arrays
            SELECT array_agg(value::float) INTO a_values FROM jsonb_array_elements_text(a);
            SELECT array_agg(value::float) INTO b_values FROM jsonb_array_elements_text(b);
            
            -- Calculate dot product and norms
            FOR i IN 1..least(array_length(a_values, 1), array_length(b_values, 1))
            LOOP
                dot_product := dot_product + a_values[i] * b_values[i];
                norm_a := norm_a + a_values[i] * a_values[i];
                norm_b := norm_b + b_values[i] * b_values[i];
            END LOOP;
            
            -- Return cosine distance (1 - cosine similarity)
            IF norm_a = 0 OR norm_b = 0 THEN
                RETURN 1; -- Maximum distance for zero vectors
            ELSE
                RETURN 1 - (dot_product / (sqrt(norm_a) * sqrt(norm_b)));
            END IF;
        END;
        $$;
        
        -- Create the operator if it doesn't exist
        CREATE OPERATOR <=> (
            LEFTARG = jsonb,
            RIGHTARG = jsonb,
            PROCEDURE = cosine_distance,
            COMMUTATOR = '<=>'
        );
        
        -- Create an operator class for the cosine distance operator if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_opclass WHERE opcname = 'cosine_ops'
        ) THEN
            CREATE OPERATOR CLASS cosine_ops
            DEFAULT FOR TYPE jsonb USING gin
            AS
                OPERATOR 1 <=>;
        END IF;
    END IF;
END $$;

-- Create a GIN index on the vector field for faster similarity searches if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_embeddings_vector_gin'
    ) THEN
        CREATE INDEX "idx_embeddings_vector_gin" ON "embeddings_store" USING GIN ("vector");
    END IF;
END $$;

-- Add a trigger to update the updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for embeddings_store if it doesn't exist
DROP TRIGGER IF EXISTS update_embeddings_store_updated_at ON "embeddings_store";
CREATE TRIGGER update_embeddings_store_updated_at
BEFORE UPDATE ON "embeddings_store"
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Comment on functions and operators
COMMENT ON FUNCTION cosine_distance(jsonb, jsonb) IS 'Calculates cosine distance between two embedding vectors stored as JSONB arrays';
COMMENT ON OPERATOR <=> (jsonb, jsonb) IS 'Cosine distance operator for similarity search between embedding vectors';