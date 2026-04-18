using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class Order
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;

    public DeliveryType DeliveryType { get; set; }

    // Preenchido apenas quando DeliveryType == Delivery
    public string? Street { get; set; }
    public string? Number { get; set; }
    public string? Complement { get; set; }
    public string? Neighborhood { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ZipCode { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal DeliveryFee { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Preparando;

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<OrderItem> Items { get; set; } = [];
}

public enum DeliveryType
{
    Pickup,
    Delivery
}

public enum OrderStatus
{
    Preparando,
    Pronto,
    Entregue,
    Cancelado
}
