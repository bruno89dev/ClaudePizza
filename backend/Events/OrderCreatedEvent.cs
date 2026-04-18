using MediatR;

namespace backend.Events;

public record OrderCreatedEvent(int OrderId, string UserName, decimal TotalAmount) : INotification;
