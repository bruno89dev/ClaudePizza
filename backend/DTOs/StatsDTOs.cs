namespace backend.DTOs;

public record DailyStat(string Date, int Orders, decimal Revenue);
public record StatusStat(string Status, int Count);
public record FlavorStat(string FlavorName, int Count);
public record SizeStat(string Size, int Count);
public record DeliveryTypeStat(string Type, int Count);
public record ClientStat(string UserName, int OrderCount, decimal TotalSpent);

public record OrderStatsResponse(
    List<DailyStat> DailyStats,
    List<StatusStat> StatusBreakdown,
    List<FlavorStat> TopFlavors,
    List<SizeStat> SizeBreakdown,
    List<DeliveryTypeStat> DeliveryTypeBreakdown,
    decimal TotalRevenue,
    int TotalOrders,
    decimal AverageTicket,
    double CancellationRate,
    double AverageRating,
    List<ClientStat> TopClients);
