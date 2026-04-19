namespace backend.Models;

public class Promotion
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }

    public bool IsIndeterminate { get; set; } = false;
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidTo { get; set; }

    public string? WeekDays { get; set; }           // ex: "1,2,3,4,5" (0=Dom … 6=Sáb)
    public string? ApplicableCategory { get; set; } // "Pizzas" | "Bordas" | "Bebidas" | "Entrega" | null = todas
    public string? ApplicableSize { get; set; }     // tamanho de bebida: "Lata 350mL" | "Latão 473mL" | etc.

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum DiscountType
{
    Percentage,
    FixedAmount
}
