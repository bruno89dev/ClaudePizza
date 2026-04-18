using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int FlavorId { get; set; }
    public Flavor Flavor { get; set; } = null!;

    public string Size { get; set; } = string.Empty;      // Pequena, Média, Grande
    public string? Crust { get; set; }                    // Catupiry, Cheddar, etc.
    public string? Extras { get; set; }                   // JSON array: ["Bacon", "Cebola"]

    public int Quantity { get; set; } = 1;

    [Column(TypeName = "decimal(10,2)")]
    public decimal UnitPrice { get; set; }
}
