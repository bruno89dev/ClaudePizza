using System.Text.Json;
using backend.DTOs;

namespace backend.Services;

public class DeliveryService(IConfiguration config, HttpClient httpClient)
{
    private readonly double _pizzariaLat = double.Parse(config["Delivery:PizzariaLat"] ?? "-19.5935");
    private readonly double _pizzariaLng = double.Parse(config["Delivery:PizzariaLng"] ?? "-46.9408");

    public async Task<DeliveryEstimateResponse?> EstimateAsync(string zipCode)
    {
        var viaCep = await GetAddressFromCepAsync(zipCode);
        if (viaCep is null || viaCep.Erro) return null;

        var fullAddress = $"{viaCep.Logradouro}, {viaCep.Bairro}, {viaCep.Localidade}, {viaCep.Uf}, Brasil";
        var coords = await GeocodeAsync(fullAddress);

        var distanceKm = coords.HasValue
            ? Haversine(_pizzariaLat, _pizzariaLng, coords.Value.lat, coords.Value.lng)
            : 0;

        return new DeliveryEstimateResponse(
            Street: viaCep.Logradouro,
            Neighborhood: viaCep.Bairro,
            City: viaCep.Localidade,
            State: viaCep.Uf,
            ZipCode: zipCode,
            DistanceKm: Math.Round(distanceKm, 1),
            Fee: CalculateFee(distanceKm));
    }

    private async Task<ViaCepResponse?> GetAddressFromCepAsync(string cep)
    {
        var clean = cep.Replace("-", "").Trim();
        try
        {
            var res = await httpClient.GetAsync($"https://viacep.com.br/ws/{clean}/json/");
            if (!res.IsSuccessStatusCode) return null;
            return JsonSerializer.Deserialize<ViaCepResponse>(
                await res.Content.ReadAsStringAsync(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch { return null; }
    }

    // Nominatim — OpenStreetMap geocoding, free, no API key required
    private async Task<(double lat, double lng)?> GeocodeAsync(string address)
    {
        var encoded = Uri.EscapeDataString(address);
        var url = $"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1";
        try
        {
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "ClaudePizza/1.0");
            var res = await httpClient.SendAsync(req);
            if (!res.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
            var root = doc.RootElement;
            if (root.GetArrayLength() == 0) return null;

            var first = root[0];
            return (
                double.Parse(first.GetProperty("lat").GetString()!, System.Globalization.CultureInfo.InvariantCulture),
                double.Parse(first.GetProperty("lon").GetString()!, System.Globalization.CultureInfo.InvariantCulture)
            );
        }
        catch { return null; }
    }

    private static double Haversine(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371;
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
              * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;

    private static decimal CalculateFee(double km) => km switch
    {
        <= 3  => 5.00m,
        <= 6  => 8.00m,
        <= 10 => 12.00m,
        <= 15 => 18.00m,
        _     => 25.00m
    };
}

internal class ViaCepResponse
{
    public string Logradouro { get; set; } = string.Empty;
    public string Bairro     { get; set; } = string.Empty;
    public string Localidade { get; set; } = string.Empty;
    public string Uf         { get; set; } = string.Empty;
    public string Cep        { get; set; } = string.Empty;
    public bool   Erro       { get; set; }
}
