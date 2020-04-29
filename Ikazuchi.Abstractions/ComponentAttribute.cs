using System;
using Microsoft.Extensions.DependencyInjection;

namespace Ikazuchi.Abstractions
{
    [AttributeUsage(AttributeTargets.Class)]
    public class ComponentAttribute : Attribute
    {
        public ComponentAttribute(ServiceLifetime lifetime)
        {
            Lifetime = lifetime;
        }

        public ServiceLifetime Lifetime { get; }

        public Type ServiceType { get; set; }
    }
}