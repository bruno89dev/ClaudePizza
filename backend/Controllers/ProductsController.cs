using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var products = await db.Products
            .OrderBy(p => p.Name)
            .Select(p => new ProductResponse(p.Id, p.Name, p.Description, p.Price, p.Category, p.ImageUrl, p.IsAvailable, p.CreatedAt))
            .ToListAsync();
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await db.Products.FindAsync(id);
        if (p is null) return NotFound();
        return Ok(new ProductResponse(p.Id, p.Name, p.Description, p.Price, p.Category, p.ImageUrl, p.IsAvailable, p.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(ProductRequest req)
    {
        var product = new Product
        {
            Name = req.Name,
            Description = req.Description,
            Price = req.Price,
            Category = req.Category,
            ImageUrl = req.ImageUrl,
            IsAvailable = req.IsAvailable
        };
        db.Products.Add(product);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = product.Id },
            new ProductResponse(product.Id, product.Name, product.Description, product.Price, product.Category, product.ImageUrl, product.IsAvailable, product.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, ProductRequest req)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();

        product.Name = req.Name;
        product.Description = req.Description;
        product.Price = req.Price;
        product.Category = req.Category;
        product.ImageUrl = req.ImageUrl;
        product.IsAvailable = req.IsAvailable;

        await db.SaveChangesAsync();
        return Ok(new ProductResponse(product.Id, product.Name, product.Description, product.Price, product.Category, product.ImageUrl, product.IsAvailable, product.CreatedAt));
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
