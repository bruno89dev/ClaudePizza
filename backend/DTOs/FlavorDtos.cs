namespace backend.DTOs;

public record FlavorRequest(
    string Name,
    string Description,
    decimal BasePrice,
    string? ImageUrl,
    bool IsAvailable = true);

public record FlavorResponse(
    int Id,
    string Name,
    string Description,
    decimal BasePrice,
    string? ImageUrl,
    bool IsAvailable,
    DateTime CreatedAt);
