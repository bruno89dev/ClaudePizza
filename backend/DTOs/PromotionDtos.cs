using backend.Models;

namespace backend.DTOs;

public record PromotionRequest(
    string Name,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    DateTime ValidFrom,
    DateTime ValidTo,
    bool IsActive = true);

public record PromotionResponse(
    int Id,
    string Name,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    DateTime ValidFrom,
    DateTime ValidTo,
    bool IsActive,
    DateTime CreatedAt);
