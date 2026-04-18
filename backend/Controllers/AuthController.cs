using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(UserManager<AppUser> userManager, TokenService tokenService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var user = new AppUser { Name = req.Name, Email = req.Email, UserName = req.Email };
        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await userManager.AddToRoleAsync(user, UserRoles.Customer);
        user.Role = UserRoles.Customer;
        await userManager.UpdateAsync(user);

        var token = tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Name, user.Email!, user.Role));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized("Credenciais inválidas.");

        var token = tokenService.GenerateToken(user);
        return Ok(new AuthResponse(token, user.Name, user.Email!, user.Role));
    }
}
