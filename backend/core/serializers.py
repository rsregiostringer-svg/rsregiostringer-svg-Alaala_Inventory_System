from rest_framework import serializers
from .models import User, Location, AuditLog


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    location_details = LocationSerializer(source='location', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'location', 'location_details',
            'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(
        required=True,
        allow_blank=False,
        error_messages={'required': 'First name / full name is required.', 'blank': 'First name / full name cannot be blank.'}
    )
    last_name = serializers.CharField(
        required=True,
        allow_blank=False,
        error_messages={'required': 'Last name is required.', 'blank': 'Last name cannot be blank.'}
    )
    email = serializers.CharField(required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone_number', 'location', 'is_active', 'password'
        ]

    def validate_username(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Username cannot be empty.")
        existing = User.objects.filter(username__iexact=cleaned)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        if existing.exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return cleaned

    def validate(self, attrs):
        if not self.instance and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'Password is required when creating a new user.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if user.role in [User.Role.MASTER_ADMIN, User.Role.ADMIN]:
            user.is_staff = True
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if instance.role in [User.Role.MASTER_ADMIN, User.Role.ADMIN]:
            instance.is_staff = True
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_repr', 'action', 'module',
            'record_id', 'record_repr', 'old_value', 'new_value',
            'description', 'ip_address', 'timestamp'
        ]
        read_only_fields = fields
