using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Ikazuchi.Web.Models;
using Microsoft.AspNetCore.Http;

namespace Ikazuchi.Web.Controllers
{
    public class ErrorController : Controller
    {
        private readonly ILogger<ErrorController> _logger;

        public ErrorController(ILogger<ErrorController> logger)
        {
            _logger = logger;
        }

        private string GetRequestId() => Activity.Current?.Id ?? HttpContext.TraceIdentifier ?? "Unknown";

        public new IActionResult Unauthorized()
        {
            HttpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;

            return View("General", new ErrorViewModel()
            {
                Description = "You're not authorized to view the page or to perform such action",
                Message = "Unauthorized",
                RequestId = GetRequestId()
            });
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Vanilla()
        {
            return View("Vanilla", new ErrorViewModel {RequestId = GetRequestId()});
        }
    }
}