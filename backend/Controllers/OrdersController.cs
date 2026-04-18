using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Events;
using backend.Models;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Authorize]
[ApiController]
[Route("api/orders")]
public class OrdersController(AppDbContext db, IMediator mediator) : ControllerBase
{
    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private bool IsAdmin => User.IsInRole(UserRoles.Admin);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Flavor)
            .Include(o => o.User)
            .AsQueryable();

        if (!IsAdmin)
            query = query.Where(o => o.UserId == CurrentUserId);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => MapToResponse(o))
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Flavor)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();
        if (!IsAdmin && order.UserId != CurrentUserId) return Forbid();

        return Ok(MapToResponse(order));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrderRequest req)
    {
        var order = new Order
        {
            UserId       = CurrentUserId,
            DeliveryType = req.DeliveryType,
            Street       = req.Street,
            Number       = req.Number,
            Complement   = req.Complement,
            Neighborhood = req.Neighborhood,
            City         = req.City,
            State        = req.State,
            ZipCode      = req.ZipCode,
            DeliveryFee  = req.DeliveryFee,
            Items = req.Items.Select(i => new OrderItem
            {
                FlavorId  = i.FlavorId,
                Size      = i.Size,
                Crust     = i.Crust,
                Extras    = i.Extras,
                Quantity  = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };

        order.TotalAmount = order.Items.Sum(i => i.UnitPrice * i.Quantity) + order.DeliveryFee;

        db.Orders.Add(order);
        await db.SaveChangesAsync();

        await db.Entry(order).Reference(o => o.User).LoadAsync();
        foreach (var item in order.Items)
            await db.Entry(item).Reference(i => i.Flavor).LoadAsync();

        // Domain event — decoupled from notification infrastructure
        await mediator.Publish(new OrderCreatedEvent(order.Id, order.User.Name, order.TotalAmount));

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToResponse(order));
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateOrderStatusRequest req)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Flavor)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();

        order.Status    = req.Status;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Domain event — handler decides how to notify (SignalR today, email/queue tomorrow)
        await mediator.Publish(new OrderStatusChangedEvent(order.Id, req.Status));

        return Ok(MapToResponse(order));
    }

    private static OrderResponse MapToResponse(Order o) => new(
        o.Id, o.UserId, o.User?.Name ?? "",
        o.DeliveryType,
        o.Street, o.Number, o.Complement, o.Neighborhood, o.City, o.State, o.ZipCode,
        o.DeliveryFee, o.Status, o.TotalAmount, o.CreatedAt,
        o.Items.Select(i => new OrderItemResponse(
            i.Id, i.FlavorId, i.Flavor?.Name ?? "",
            i.Size, i.Crust, i.Extras, i.Quantity, i.UnitPrice
        )).ToList());
}
