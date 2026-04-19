using backend.Models;

namespace backend.DTOs;

public record PromotionRequest(
    string Name,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    bool IsIndeterminate,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    string? WeekDays,
    string? ApplicableCategory,
    bool IsActive = true);

public record PromotionResponse(
    int Id,
    string Name,
    string Description,
    DiscountType DiscountType,
    decimal DiscountValue,
    bool IsIndeterminate,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    string? WeekDays,
    string? ApplicableCategory,
    bool IsActive,
    DateTime CreatedAt);
