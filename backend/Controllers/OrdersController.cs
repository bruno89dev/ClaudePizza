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

        var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
        var activeToday = await GetActiveTodayAsync();
        return Ok(orders.Select(o => MapToResponse(o, activeToday)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Flavor)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();
        if (!IsAdmin && order.UserId != CurrentUserId) return Forbid();

        var activeToday = await GetActiveTodayAsync();
        return Ok(MapToResponse(order, activeToday));
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
            PaymentMethod = req.PaymentMethod,
            ChangeFor     = req.ChangeFor,
            Items = req.Items.Select(i => new OrderItem
            {
                FlavorId  = i.FlavorId,
                ItemName  = i.ItemName,
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

        await mediator.Publish(new OrderCreatedEvent(order.Id, order.User.Name, order.TotalAmount));

        var activeToday = await GetActiveTodayAsync();
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToResponse(order, activeToday));
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:int}/status")]
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

        await mediator.Publish(new OrderStatusChangedEvent(order.Id, req.Status));

        var activeToday = await GetActiveTodayAsync();
        return Ok(MapToResponse(order, activeToday));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        try
        {
        var fromDate = DateTime.SpecifyKind(from.Date, DateTimeKind.Utc);
        var toDate   = DateTime.SpecifyKind(to.Date.AddDays(1), DateTimeKind.Utc);

        if ((toDate - fromDate).TotalDays > 91)
            return BadRequest("Intervalo máximo de 90 dias.");

        var orders = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.Flavor)
            .Where(o => o.CreatedAt >= fromDate && o.CreatedAt < toDate)
            .ToListAsync();

        var dailyStats = orders
            .GroupBy(o => o.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DailyStat(
                g.Key.ToString("yyyy-MM-dd"),
                g.Count(),
                g.Where(o => o.Status != OrderStatus.Cancelado).Sum(o => o.TotalAmount)))
            .ToList();

        var statusBreakdown = orders
            .GroupBy(o => o.Status.ToString())
            .Select(g => new StatusStat(g.Key, g.Count()))
            .ToList();

        var topFlavors = orders
            .SelectMany(o => o.Items)
            .Where(i => i.Flavor != null)
            .GroupBy(i => i.Flavor!.Name)
            .OrderByDescending(g => g.Sum(i => i.Quantity))
            .Take(5)
            .Select(g => new FlavorStat(g.Key, g.Sum(i => i.Quantity)))
            .ToList();

        var sizeBreakdown = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.Size)
            .Select(g => new SizeStat(g.Key, g.Sum(i => i.Quantity)))
            .ToList();

        var deliveryTypeBreakdown = orders
            .GroupBy(o => o.DeliveryType == DeliveryType.Delivery ? "Entrega" : "Retirada")
            .Select(g => new DeliveryTypeStat(g.Key, g.Count()))
            .ToList();

        var validOrders = orders.Where(o => o.Status != OrderStatus.Cancelado).ToList();
        var totalRevenue = validOrders.Sum(o => o.TotalAmount);
        var totalOrders = orders.Count;
        var averageTicket = validOrders.Count > 0 ? validOrders.Average(o => (double)o.TotalAmount) : 0;
        var cancellationRate = totalOrders > 0
            ? (double)orders.Count(o => o.Status == OrderStatus.Cancelado) / totalOrders * 100
            : 0;
        var ratedOrders = orders.Where(o => o.Rating.HasValue).ToList();
        var averageRating = ratedOrders.Count > 0 ? ratedOrders.Average(o => (double)o.Rating!.Value) : 0.0;

        return Ok(new OrderStatsResponse(
            dailyStats, statusBreakdown, topFlavors, sizeBreakdown, deliveryTypeBreakdown,
            totalRevenue, totalOrders, (decimal)averageTicket, cancellationRate, averageRating));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPatch("{id:int}/rate")]
    public async Task<IActionResult> RateOrder(int id, RateOrderRequest req)
    {
        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest("A avaliação deve ser entre 1 e 5.");

        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();
        if (!IsAdmin && order.UserId != CurrentUserId) return Forbid();
        if (order.Status != OrderStatus.Entregue)
            return BadRequest("Só é possível avaliar pedidos entregues.");

        order.Rating = req.Rating;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Returns all active (non-delivered, non-cancelled) orders from today for queue calculation
    private async Task<List<Order>> GetActiveTodayAsync()
    {
        var today = DateTime.UtcNow.Date;
        return await db.Orders
            .Where(o => o.CreatedAt >= today
                     && o.Status != OrderStatus.Entregue
                     && o.Status != OrderStatus.Cancelado)
            .ToListAsync();
    }

    private static OrderResponse MapToResponse(Order o, List<Order> activeToday)
    {
        DateTime? estimatedDeliveryAt = null;

        if (o.Status != OrderStatus.Entregue && o.Status != OrderStatus.Cancelado)
        {
            var today = DateTime.UtcNow.Date;
            if (o.CreatedAt.Date == today)
            {
                var position = activeToday.Count(a => a.Id != o.Id && a.CreatedAt < o.CreatedAt);
                var dow = DateTime.UtcNow.DayOfWeek;
                var baseMinutes = dow is DayOfWeek.Friday or DayOfWeek.Saturday or DayOfWeek.Sunday
                    ? 60 : 30;
                if (o.DeliveryType == DeliveryType.Pickup)
                    baseMinutes = Math.Max(0, baseMinutes - 20);
                estimatedDeliveryAt = o.CreatedAt.AddMinutes(baseMinutes + position * 15);
            }
        }

        return new OrderResponse(
            o.Id, o.UserId, o.User?.Name ?? "",
            o.DeliveryType,
            o.Street, o.Number, o.Complement, o.Neighborhood, o.City, o.State, o.ZipCode,
            o.DeliveryFee, o.Status, o.TotalAmount, o.CreatedAt,
            o.Items.Select(i => new OrderItemResponse(
                i.Id, i.FlavorId ?? 0, i.Flavor?.Name ?? i.ItemName ?? "",
                i.Size, i.Crust, i.Extras, i.Quantity, i.UnitPrice
            )).ToList(),
            estimatedDeliveryAt,
            o.PaymentMethod,
            o.ChangeFor,
            o.Rating);
    }
}
