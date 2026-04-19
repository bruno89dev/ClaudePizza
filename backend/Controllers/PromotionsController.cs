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
    private static PromotionResponse Map(Promotion p) => new(
        p.Id, p.Name, p.Description, p.DiscountType, p.DiscountValue,
        p.IsIndeterminate, p.ValidFrom, p.ValidTo,
        p.WeekDays, p.ApplicableCategory, p.IsActive, p.CreatedAt);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var promos = await db.Promotions.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(promos.Select(Map));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await db.Promotions.FindAsync(id);
        if (p is null) return NotFound();
        return Ok(Map(p));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(PromotionRequest req)
    {
        var promo = Apply(new Promotion(), req);
        db.Promotions.Add(promo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = promo.Id }, Map(promo));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, PromotionRequest req)
    {
        var promo = await db.Promotions.FindAsync(id);
        if (promo is null) return NotFound();
        Apply(promo, req);
        await db.SaveChangesAsync();
        return Ok(Map(promo));
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

    private static Promotion Apply(Promotion p, PromotionRequest req)
    {
        p.Name                = req.Name;
        p.Description         = req.Description;
        p.DiscountType        = req.DiscountType;
        p.DiscountValue       = req.DiscountValue;
        p.IsIndeterminate     = req.IsIndeterminate;
        p.ValidFrom           = req.IsIndeterminate ? null : req.ValidFrom;
        p.ValidTo             = req.IsIndeterminate ? null : req.ValidTo;
        p.WeekDays            = req.WeekDays;
        p.ApplicableCategory  = req.ApplicableCategory;
        p.IsActive            = req.IsActive;
        return p;
    }
}
