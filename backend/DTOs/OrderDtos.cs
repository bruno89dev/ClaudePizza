using backend.Models;

namespace backend.DTOs;

public record OrderItemRequest(
    int FlavorId,
    string Size,
    string? Crust,
    string? Extras,
    int Quantity,
    decimal UnitPrice);

public record CreateOrderRequest(
    DeliveryType DeliveryType,
    string? Street,
    string? Number,
    string? Complement,
    string? Neighborhood,
    string? City,
    string? State,
    string? ZipCode,
    decimal DeliveryFee,
    List<OrderItemRequest> Items);

public record UpdateOrderStatusRequest(OrderStatus Status);

public record OrderItemResponse(
    int Id,
    int FlavorId,
    string FlavorName,
    string Size,
    string? Crust,
    string? Extras,
    int Quantity,
    decimal UnitPrice);

public record OrderResponse(
    int Id,
    string UserId,
    string UserName,
    DeliveryType DeliveryType,
    string? Street,
    string? Number,
    string? Complement,
    string? Neighborhood,
    string? City,
    string? State,
    string? ZipCode,
    decimal DeliveryFee,
    OrderStatus Status,
    decimal TotalAmount,
    DateTime CreatedAt,
    List<OrderItemResponse> Items);
