# Beans API Guideline

This document describes the API endpoints for managing bookmark collections and bookmarks. All endpoints are prefixed with `/api/beans` and require a valid Bearer token in the `Authorization` header.

## Collections

### Create Collection
Create a new bookmark collection.

- **Method**: `POST`
- **Path**: `/api/beans/collection`
- **Body**:
  ```json
  {
    "name": "My Collection"
  }
  ```
- **Usage**: Used to organize bookmarks into logical groups.

### List Collections
Retrieve all collections created by the current user.

- **Method**: `GET`
- **Path**: `/api/beans/collection`
- **Body**: None
- **Usage**: Typically used to populate a sidebar or dropdown for collection selection.

### Update Collection
Rename an existing collection.

- **Method**: `PUT`
- **Path**: `/api/beans/collection/:id`
- **Body**:
  ```json
  {
    "name": "New Collection Name"
  }
  ```
- **Usage**: Change the display name of a collection.

### Delete Collection
Remove a collection and all bookmarks contained within it.

- **Method**: `DELETE`
- **Path**: `/api/beans/collection/:id`
- **Body**: None
- **Usage**: Deletes the collection. **Warning**: This action cascades and deletes all bookmarks in this collection.

---

## Bookmarks

### Add Bookmark
Add a new bookmark to a specific collection.

- **Method**: `POST`
- **Path**: `/api/beans/bookmark`
- **Body**:
  ```json
  {
    "collectionId": "uuid-string",
    "url": "https://example.com",
    "name": "Example Site",
    "description": "Short description",
    "note": "Personal notes about this link",
    "tags": ["tag1", "tag2"]
  }
  ```
- **Usage**: Create a new bookmark entry with optional metadata and tags.

### Update Bookmark
Update bookmark details or move it to a different collection.

- **Method**: `PUT`
- **Path**: `/api/beans/bookmark/:id`
- **Body**: All fields are optional.
  ```json
  {
    "collectionId": "new-uuid-string",
    "url": "https://updated-link.com",
    "name": "New Name",
    "description": "Updated description",
    "note": "Updated notes",
    "tags": ["new-tag"]
  }
  ```
- **Usage**: Modify any field of an existing bookmark. Providing `collectionId` will move the bookmark.

### Delete Bookmark
Permanently remove a bookmark.

- **Method**: `DELETE`
- **Path**: `/api/beans/bookmark/:id`
- **Body**: None
- **Usage**: Remove a single bookmark entry.

### List All Bookmarks
Retrieve all bookmarks across all collections for the current user.

- **Method**: `GET`
- **Path**: `/api/beans/bookmark`
- **Body**: None
- **Usage**: Used to show a "All Bookmarks" view. Each bookmark object includes its parent `collectionId`.
