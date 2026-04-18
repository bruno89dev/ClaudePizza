using backend.Events;
using backend.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace backend.Handlers;

public class NotifyAdminOnOrderCreatedHandler(IHubContext<OrderHub> hub)
    : INotificationHandler<OrderCreatedEvent>
{
    public async Task Handle(OrderCreatedEvent notification, CancellationToken ct)
    {
        await hub.Clients
            .Group("admins")
            .SendAsync("NewOrderReceived", new
            {
                orderId     = notification.OrderId,
                userName    = notification.UserName,
                totalAmount = notification.TotalAmount
            }, ct);
    }
}
