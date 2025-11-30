-- Migration: Add node_tag table for node tags feature
-- Date: 2024

CREATE TABLE node_tag (
    node_id INTEGER NOT NULL,
    tag VARCHAR(255) NOT NULL,
    PRIMARY KEY (node_id, tag),
    FOREIGN KEY (node_id) REFERENCES node(id) ON DELETE CASCADE
);

CREATE INDEX idx_node_tag_tag ON node_tag(tag);
CREATE INDEX idx_node_tag_node_id ON node_tag(node_id);

