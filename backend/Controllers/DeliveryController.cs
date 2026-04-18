using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/delivery")]
public class DeliveryController(DeliveryService deliveryService) : ControllerBase
{
    [HttpPost("estimate")]
    public async Task<IActionResult> Estimate(DeliveryEstimateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ZipCode))
            return BadRequest("CEP inválido.");

        var result = await deliveryService.EstimateAsync(req.ZipCode);
        if (result is null)
            return BadRequest("CEP não encontrado.");

        return Ok(result);
    }
}
