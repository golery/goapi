-- Migration: Create bookmark management tables
-- Date: 2024-12-27

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Collections table
CREATE TABLE bookmark_collection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookmark_collection_user_id ON bookmark_collection(user_id);

-- Bookmarks table
CREATE TABLE bookmark (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL,
    url TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    note TEXT,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES bookmark_collection(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmark_collection_id ON bookmark(collection_id);
CREATE INDEX idx_bookmark_user_id ON bookmark(user_id);

-- Bookmark tags table
CREATE TABLE bookmark_tag (
    bookmark_id UUID NOT NULL,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (bookmark_id, tag),
    FOREIGN KEY (bookmark_id) REFERENCES bookmark(id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmark_tag_tag ON bookmark_tag(tag);
CREATE INDEX idx_bookmark_tag_bookmark_id ON bookmark_tag(bookmark_id);
