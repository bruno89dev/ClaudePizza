namespace backend.DTOs;

public record ProductRequest(
    string Name,
    string Description,
    decimal Price,
    string Category,
    string? ImageUrl,
    bool IsAvailable = true);

public record ProductResponse(
    int Id,
    string Name,
    string Description,
    decimal Price,
    string Category,
    string? ImageUrl,
    bool IsAvailable,
    DateTime CreatedAt);
