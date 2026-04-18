using backend.Events;
using backend.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace backend.Handlers;

public class NotifyClientOnStatusChangedHandler(IHubContext<OrderHub> hub)
    : INotificationHandler<OrderStatusChangedEvent>
{
    public async Task Handle(OrderStatusChangedEvent notification, CancellationToken ct)
    {
        await hub.Clients
            .Group($"order-{notification.OrderId}")
            .SendAsync("OrderStatusChanged", new
            {
                orderId = notification.OrderId,
                status  = notification.NewStatus.ToString()
            }, ct);
    }
}
