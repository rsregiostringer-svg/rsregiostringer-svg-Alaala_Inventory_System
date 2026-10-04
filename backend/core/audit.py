from .models import AuditLog


def log_audit(request, action, module, record_id='', record_repr='', description='', old_value=None, new_value=None):
    """
    Helper to log system activities and accountability.
    """
    user = getattr(request, 'user', None) if request else None
    user_repr = user.username if (user and user.is_authenticated) else 'System'
    
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    return AuditLog.objects.create(
        user=user if (user and user.is_authenticated) else None,
        user_repr=user_repr,
        action=action,
        module=module,
        record_id=str(record_id),
        record_repr=str(record_repr)[:255],
        old_value=old_value,
        new_value=new_value,
        description=description,
        ip_address=ip_address
    )
