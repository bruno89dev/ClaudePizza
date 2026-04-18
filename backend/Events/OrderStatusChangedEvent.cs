using backend.Models;
using MediatR;

namespace backend.Events;

public record OrderStatusChangedEvent(int OrderId, OrderStatus NewStatus) : INotification;
