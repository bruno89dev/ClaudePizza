using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/promotions")]
public class PromotionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var promos = await db.Promotions
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PromotionResponse(p.Id, p.Name, p.Description, p.DiscountType, p.DiscountValue, p.ValidFrom, p.ValidTo, p.IsActive, p.CreatedAt))
            .ToListAsync();
        return Ok(promos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await db.Promotions.FindAsync(id);
        if (p is null) return NotFound();
        return Ok(new PromotionResponse(p.Id, p.Name, p.Description, p.DiscountType, p.DiscountValue, p.ValidFrom, p.ValidTo, p.IsActive, p.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(PromotionRequest req)
    {
        var promo = new Promotion
        {
            Name = req.Name,
            Description = req.Description,
            DiscountType = req.DiscountType,
            DiscountValue = req.DiscountValue,
            ValidFrom = req.ValidFrom,
            ValidTo = req.ValidTo,
            IsActive = req.IsActive
        };
        db.Promotions.Add(promo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = promo.Id },
            new PromotionResponse(promo.Id, promo.Name, promo.Description, promo.DiscountType, promo.DiscountValue, promo.ValidFrom, promo.ValidTo, promo.IsActive, promo.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, PromotionRequest req)
    {
        var promo = await db.Promotions.FindAsync(id);
        if (promo is null) return NotFound();

        promo.Name = req.Name;
        promo.Description = req.Description;
        promo.DiscountType = req.DiscountType;
        promo.DiscountValue = req.DiscountValue;
        promo.ValidFrom = req.ValidFrom;
        promo.ValidTo = req.ValidTo;
        promo.IsActive = req.IsActive;

        await db.SaveChangesAsync();
        return Ok(new PromotionResponse(promo.Id, promo.Name, promo.Description, promo.DiscountType, promo.DiscountValue, promo.ValidFrom, promo.ValidTo, promo.IsActive, promo.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var promo = await db.Promotions.FindAsync(id);
        if (promo is null) return NotFound();
        db.Promotions.Remove(promo);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
