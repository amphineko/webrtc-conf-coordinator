using Microsoft.AspNetCore.Mvc;

namespace Ikazuchi.Web.Areas.RtcSessions.Controllers
{
    [Area("RtcSessions")]
    public class NavigationController : Controller
    {
        public IActionResult Join()
        {
            return new EmptyResult();
        }
    }
}