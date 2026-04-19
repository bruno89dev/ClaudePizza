using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int? FlavorId { get; set; }
    public Flavor? Flavor { get; set; }

    public string? ItemName { get; set; }   // usado para entradas/bebidas (FlavorId == null)

    public string Size { get; set; } = string.Empty;
    public string? Crust { get; set; }
    public string? Extras { get; set; }

    public int Quantity { get; set; } = 1;

    [Column(TypeName = "decimal(10,2)")]
    public decimal UnitPrice { get; set; }
}
