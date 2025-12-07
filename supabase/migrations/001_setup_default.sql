CREATE TABLE users ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL, access_code TEXT UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE conversations ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES users(id), session_id TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE messages ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, conversation_id UUID REFERENCES conversations(id), role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), content TEXT NOT NULL, tools_used JSONB DEFAULT '[]', created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE saved_data ( id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES users(id), data_type TEXT NOT NULL, content JSONB NOT NULL, created_at TIMESTAMP DEFAULT NOW()
);
- Insertar usuario demo
INSERT INTO users (name, access_code) VALUES ('Demo User', 'DEMO123');