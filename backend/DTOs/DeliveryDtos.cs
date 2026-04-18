namespace backend.DTOs;

public record DeliveryEstimateRequest(string ZipCode);

public record DeliveryEstimateResponse(
    string Street,
    string Neighborhood,
    string City,
    string State,
    string ZipCode,
    double DistanceKm,
    decimal Fee);
