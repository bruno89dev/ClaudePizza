using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/flavors")]
public class FlavorsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var flavors = await db.Flavors
            .OrderBy(f => f.Name)
            .Select(f => new FlavorResponse(f.Id, f.Name, f.Description, f.BasePrice, f.ImageUrl, f.IsAvailable, f.CreatedAt))
            .ToListAsync();
        return Ok(flavors);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var f = await db.Flavors.FindAsync(id);
        if (f is null) return NotFound();
        return Ok(new FlavorResponse(f.Id, f.Name, f.Description, f.BasePrice, f.ImageUrl, f.IsAvailable, f.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(FlavorRequest req)
    {
        var flavor = new Flavor
        {
            Name = req.Name,
            Description = req.Description,
            BasePrice = req.BasePrice,
            ImageUrl = req.ImageUrl,
            IsAvailable = req.IsAvailable
        };
        db.Flavors.Add(flavor);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = flavor.Id },
            new FlavorResponse(flavor.Id, flavor.Name, flavor.Description, flavor.BasePrice, flavor.ImageUrl, flavor.IsAvailable, flavor.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, FlavorRequest req)
    {
        var flavor = await db.Flavors.FindAsync(id);
        if (flavor is null) return NotFound();

        flavor.Name = req.Name;
        flavor.Description = req.Description;
        flavor.BasePrice = req.BasePrice;
        flavor.ImageUrl = req.ImageUrl;
        flavor.IsAvailable = req.IsAvailable;

        await db.SaveChangesAsync();
        return Ok(new FlavorResponse(flavor.Id, flavor.Name, flavor.Description, flavor.BasePrice, flavor.ImageUrl, flavor.IsAvailable, flavor.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var flavor = await db.Flavors.FindAsync(id);
        if (flavor is null) return NotFound();
        db.Flavors.Remove(flavor);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
