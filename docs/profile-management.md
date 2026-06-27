# Subscription Profile Management

[English](profile-management.md) | [中文](profile-management.zh-CN.md)

SilverVPN stores imported subscriptions as profiles. A profile is a saved configuration source with its own local YAML file, display name and node list metadata.

All profile operations are per-user. They only modify the current user's `~/.config/SilverVPN` directory.

## List profiles

```bash
svpn profile list
```

The active profile is marked with `*`.

## Switch profile

```bash
svpn profile use 1
svpn profile use 'My Profile'
```

The selector can be a number, exact name, profile id, or a unique name fragment. If the backend is running, switching profiles restarts only the current user's daemon so the new configuration takes effect.

## Rename profile

```bash
svpn profile rename 1 'Work Nodes'
svpn profile rename 'Custom Subscription' 'Personal Nodes'
svpn profile rename custom-xxxxxx 'Backup Profile'
```

The first argument selects the profile. The remaining text is the new display name.

Renaming changes only local profile metadata. It does not modify the subscription provider, the subscription URL, or other users' profiles.

## Delete profile

Delete a non-active profile:

```bash
svpn profile delete 2
```

Delete the active profile with explicit confirmation:

```bash
svpn profile delete 1 --yes
```

Aliases:

```bash
svpn profile rm 1 --yes
svpn profile remove 1 --yes
```

Deletion removes the current user's profile record and its saved local YAML file when present. If the deleted profile is active, SilverVPN keeps the current active Clash configuration file to avoid breaking a running backend. You can select another profile with `svpn profile use ...` or import a new one with `svpn import ...`.

## Safety boundaries

Profile commands:

- only operate under the current user's home directory;
- do not write `/etc`;
- do not change system routes or DNS;
- do not enable TUN;
- do not modify other users' files.
