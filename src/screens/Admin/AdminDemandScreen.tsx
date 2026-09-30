import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Linking,
    TextInput,
    Modal,
    Alert,
    Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandHeader } from '../../components/BrandHeader';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../utils/constants';
import { getNearestZoneInfo, NearestZoneInfo } from '../../utils/geofence';
import { useAdminPermissions } from '../../store/useAdminPermissions';
import { updateDemandRequestStatus, fetchDemandRequestsAdmin } from '../../services/adminFirestore';

export interface DemandRequest {
    id: string;
    userId: string;
    userName?: string;
    userPhone?: string;
    userEmail?: string;
    address: string;
    location: { latitude: number; longitude: number };
    timestamp: any;
    status: 'new' | 'contacted' | 'converted' | 'rejected' | string;
    cartValue?: number;
    itemsCount?: number;
    itemsSummary?: string;
    items?: any[];
    notes?: string;
    nearestZone?: NearestZoneInfo;
    attemptCount?: number;
}

export interface CustomerLeadGroup {
    userId: string;
    userName: string;
    userPhone: string;
    userEmail: string;
    latestAddress: string;
    location: { latitude: number; longitude: number };
    nearestZone: NearestZoneInfo;
    attemptCount: number;
    latestTimestamp: any;
    firstTimestamp: any;
    highestCartValue: number;
    latestCartValue: number;
    latestItemsSummary: string;
    status: 'new' | 'contacted' | 'converted' | 'rejected' | string;
    requests: DemandRequest[];
}

type ViewMode = 'grouped' | 'all';
type FilterTab = 'all' | 'new' | 'contacted' | 'converted' | 'repeat' | 'nearby' | 'high_value';
type SortOption = 'recent' | 'value' | 'distance' | 'attempts';

export const AdminDemandScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { canViewCustomerPhone, canViewCustomerWhatsApp, isSuperAdmin } = useAdminPermissions();

    const [rawRequests, setRawRequests] = useState<DemandRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [viewMode, setViewMode] = useState<ViewMode>('grouped');

    // Expanded history accordion for grouped view
    const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});

    // Status modal state
    const [statusModalTarget, setStatusModalTarget] = useState<{
        requestId?: string;
        userId?: string;
        currentStatus: string;
        customerName: string;
    } | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // In-memory cache for user docs to avoid redundant Firestore reads
    const userCacheRef = React.useRef<Record<string, any>>({});

    // ─── Fetch and Enrich Demand Requests ──────────────────────────────
    const fetchRequests = useCallback(async () => {
        try {
            const data = await fetchDemandRequestsAdmin(100);

            // Compute distance & feasibility from nearest zone for each request
            const enriched = data.map((item: any) => ({
                ...item,
                nearestZone: getNearestZoneInfo(item.location),
            }));

            setRawRequests(enriched);
        } catch (error) {
            console.error('Error fetching demand requests:', error);
            Alert.alert('Error', 'Failed to load demand requests. Pull down to try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    // ─── Customer-Level Aggregation (Grouped View) ─────────────────────
    const customerGroups = useMemo<CustomerLeadGroup[]>(() => {
        const groupsMap: Record<string, CustomerLeadGroup> = {};

        rawRequests.forEach(req => {
            const key = req.userId || req.userPhone || req.id;

            if (!groupsMap[key]) {
                groupsMap[key] = {
                    userId: req.userId || key,
                    userName: req.userName || 'Customer',
                    userPhone: req.userPhone || '',
                    userEmail: req.userEmail || '',
                    latestAddress: req.address,
                    location: req.location,
                    nearestZone: req.nearestZone || getNearestZoneInfo(req.location),
                    attemptCount: 0,
                    latestTimestamp: req.timestamp,
                    firstTimestamp: req.timestamp,
                    highestCartValue: req.cartValue || 0,
                    latestCartValue: req.cartValue || 0,
                    latestItemsSummary: req.itemsSummary || '',
                    status: req.status || 'new',
                    requests: [],
                };
            }

            const group = groupsMap[key];
            group.attemptCount += 1;
            group.requests.push(req);

            // Update highest cart value
            if ((req.cartValue || 0) > group.highestCartValue) {
                group.highestCartValue = req.cartValue || 0;
            }

            // Keep name/phone updated if found on any request
            if ((!group.userName || group.userName === 'Customer') && req.userName) {
                group.userName = req.userName;
            }
            if (!group.userPhone && req.userPhone) {
                group.userPhone = req.userPhone;
            }

            // If any request in group was converted, promote group status
            if (req.status === 'converted') {
                group.status = 'converted';
            } else if (req.status === 'contacted' && group.status !== 'converted') {
                group.status = 'contacted';
            }
        });

        return Object.values(groupsMap);
    }, [rawRequests]);

    // ─── Filter & Sort Pipeline ────────────────────────────────────────
    const filteredGroupedData = useMemo(() => {
        return customerGroups.filter(lead => {
            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = lead.userName.toLowerCase().includes(q);
                const matchPhone = lead.userPhone.includes(q);
                const matchAddress = lead.latestAddress.toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchAddress) return false;
            }

            // Tab filter
            switch (activeTab) {
                case 'new':
                    return lead.status === 'new';
                case 'contacted':
                    return lead.status === 'contacted';
                case 'converted':
                    return lead.status === 'converted';
                case 'repeat':
                    return lead.attemptCount >= 2;
                case 'nearby':
                    return lead.nearestZone.feasibility === 'near';
                case 'high_value':
                    return lead.highestCartValue >= 500;
                default:
                    return true;
            }
        }).sort((a, b) => {
            switch (sortBy) {
                case 'value':
                    return (b.highestCartValue || 0) - (a.highestCartValue || 0);
                case 'distance':
                    return (a.nearestZone.distanceMeters || 0) - (b.nearestZone.distanceMeters || 0);
                case 'attempts':
                    return b.attemptCount - a.attemptCount;
                case 'recent':
                default: {
                    const timeA = a.latestTimestamp?.toMillis?.() || a.latestTimestamp?.seconds * 1000 || 0;
                    const timeB = b.latestTimestamp?.toMillis?.() || b.latestTimestamp?.seconds * 1000 || 0;
                    return timeB - timeA;
                }
            }
        });
    }, [customerGroups, searchQuery, activeTab, sortBy]);

    const filteredAllData = useMemo(() => {
        return rawRequests.filter(req => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = (req.userName || '').toLowerCase().includes(q);
                const matchPhone = (req.userPhone || '').includes(q);
                const matchAddress = req.address.toLowerCase().includes(q);
                if (!matchName && !matchPhone && !matchAddress) return false;
            }

            switch (activeTab) {
                case 'new':
                    return req.status === 'new';
                case 'contacted':
                    return req.status === 'contacted';
                case 'converted':
                    return req.status === 'converted';
                case 'repeat':
                    return (req.attemptCount || 1) >= 2;
                case 'nearby':
                    return req.nearestZone?.feasibility === 'near';
                case 'high_value':
                    return (req.cartValue || 0) >= 500;
                default:
                    return true;
            }
        }).sort((a, b) => {
            switch (sortBy) {
                case 'value':
                    return (b.cartValue || 0) - (a.cartValue || 0);
                case 'distance':
                    return (a.nearestZone?.distanceMeters || 0) - (b.nearestZone?.distanceMeters || 0);
                case 'recent':
                default: {
                    const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
                    const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
                    return timeB - timeA;
                }
            }
        });
    }, [rawRequests, searchQuery, activeTab, sortBy]);

    // ─── KPI Metrics ───────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const totalUniqueLeads = customerGroups.length;
        const repeatLeads = customerGroups.filter(g => g.attemptCount >= 2).length;
        const totalPipelineValue = customerGroups.reduce((acc, g) => acc + (g.highestCartValue || 0), 0);
        const convertedLeads = customerGroups.filter(g => g.status === 'converted').length;

        return {
            totalUniqueLeads,
            repeatLeads,
            totalPipelineValue,
            convertedLeads,
        };
    }, [customerGroups]);

    // ─── Actions & Handlers ────────────────────────────────────────────
    const openMaps = (lat: number, lng: number) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url);
    };

    const handleCallCustomer = (phone: string) => {
        if (!phone) {
            Alert.alert('Phone Unavailable', 'No contact phone number is associated with this lead.');
            return;
        }
        const clean = phone.replace(/[^\d+]/g, '');
        Linking.openURL(`tel:${clean}`);
    };

    const handleWhatsAppLead = (lead: { name: string; phone: string; address: string; cartValue?: number; itemsSummary?: string }) => {
        if (!lead.phone) {
            Alert.alert('Phone Unavailable', 'No phone number available to contact via WhatsApp.');
            return;
        }

        // Normalize Indian phone for WhatsApp URL
        const cleanDigits = lead.phone.replace(/\D/g, '');
        const whatsappNumber = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

        const firstName = (lead.name || 'there').trim().split(' ')[0];
        const areaName = lead.address.split(',')[0] || 'your area';
        const serviceContext = lead.itemsSummary ? `for ${lead.itemsSummary}` : 'laundry service';
        const valueContext = lead.cartValue ? ` (~₹${lead.cartValue})` : '';

        const message = `Hi ${firstName}! 👋\n\nWe noticed you tried placing a booking on SpinZo ${serviceContext}${valueContext} at ${areaName}.\n\nAlthough your location is slightly beyond our standard boundary, our pickup vehicle is nearby and we'd love to help pick up your clothes!\n\nCan we arrange this pickup for you today? 🧺`;

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open WhatsApp on this device.');
        });
    };

    const handleStatusUpdate = async (newStatus: 'new' | 'contacted' | 'converted' | 'rejected') => {
        if (!statusModalTarget) return;

        setIsUpdatingStatus(true);
        try {
            // If in individual mode
            if (statusModalTarget.requestId) {
                await updateDemandRequestStatus(statusModalTarget.requestId, newStatus);
                setRawRequests(prev => prev.map(r => r.id === statusModalTarget.requestId ? { ...r, status: newStatus } : r));
            }
            // If in grouped mode, update all associated requests for this customer
            else if (statusModalTarget.userId) {
                const group = customerGroups.find(g => g.userId === statusModalTarget.userId);
                if (group) {
                    await Promise.all(
                        group.requests.map(r => updateDemandRequestStatus(r.id, newStatus))
                    );
                    setRawRequests(prev => prev.map(r => r.userId === statusModalTarget.userId ? { ...r, status: newStatus } : r));
                }
            }
            setStatusModalTarget(null);
        } catch {
            Alert.alert('Error', 'Failed to update status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const toggleExpand = (userId: string) => {
        setExpandedUserIds(prev => ({ ...prev, [userId]: !prev[userId] }));
    };

    const maskPhone = (phone: string) => {
        if (!phone) return 'Phone not provided';
        if (canViewCustomerPhone) return phone;
        const clean = phone.replace(/\D/g, '');
        return `•••••• ${clean.slice(-4)}`;
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'Recently';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'converted':
                return { bg: '#DEF7EC', text: '#03543F', label: 'Converted' };
            case 'contacted':
                return { bg: '#E1EFFE', text: '#1E429F', label: 'Contacted' };
            case 'rejected':
                return { bg: '#FDE8E8', text: '#9B1C1C', label: 'Too Far / Lost' };
            case 'new':
            default:
                return { bg: '#FEF08A', text: '#854D0E', label: 'New Lead' };
        }
    };

    const getFeasibilityBadgeStyle = (feasibility: 'near' | 'moderate' | 'far') => {
        switch (feasibility) {
            case 'near':
                return { bg: '#DEF7EC', text: '#03543F', icon: 'checkmark-circle' };
            case 'moderate':
                return { bg: '#FEF08A', text: '#854D0E', icon: 'alert-circle' };
            case 'far':
            default:
                return { bg: '#F3F4F6', text: '#4B5563', icon: 'navigate-circle' };
        }
    };

    // ─── Render Customer Lead Card (Grouped View) ───────────────────────
    const renderCustomerCard = ({ item }: { item: CustomerLeadGroup }) => {
        const isExpanded = !!expandedUserIds[item.userId];
        const statusBadge = getStatusBadgeStyle(item.status);
        const feasBadge = getFeasibilityBadgeStyle(item.nearestZone.feasibility);
        const hasPhone = !!item.userPhone;

        return (
            <View style={styles.card}>
                {/* Header Row: Customer Identity & Status */}
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(item.userName || 'C').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.customerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.customerName} numberOfLines={1}>{item.userName}</Text>
                            <TouchableOpacity
                                style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
                                onPress={() => setStatusModalTarget({
                                    userId: item.userId,
                                    currentStatus: item.status,
                                    customerName: item.userName,
                                })}
                            >
                                <Text style={[styles.statusText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
                                <Ionicons name="chevron-down" size={12} color={statusBadge.text} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.customerPhone}>
                            <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} /> {maskPhone(item.userPhone)}
                        </Text>
                    </View>
                </View>

                {/* Intelligence Chips Row: Distance, Attempts, Cart Value */}
                <View style={styles.chipsRow}>
                    {/* Proximity Pill */}
                    <View style={[styles.chip, { backgroundColor: feasBadge.bg }]}>
                        <Ionicons name={feasBadge.icon as any} size={13} color={feasBadge.text} />
                        <Text style={[styles.chipText, { color: feasBadge.text }]}>
                            {item.nearestZone.formattedDistance} from {item.nearestZone.nearestZoneName.split('/')[0]}
                        </Text>
                    </View>

                    {/* Attempt Count Badge */}
                    {item.attemptCount > 1 ? (
                        <View style={[styles.chip, styles.repeatChip]}>
                            <Text style={styles.repeatChipText}>🔥 {item.attemptCount} Attempts</Text>
                        </View>
                    ) : (
                        <View style={[styles.chip, styles.singleChip]}>
                            <Text style={styles.singleChipText}>1 Attempt</Text>
                        </View>
                    )}

                    {/* Potential Basket Value */}
                    {item.highestCartValue > 0 && (
                        <View style={[styles.chip, styles.valueChip]}>
                            <Text style={styles.valueChipText}>💰 ₹{item.highestCartValue}</Text>
                        </View>
                    )}
                </View>

                {/* Items & Basket Intent */}
                {!!item.latestItemsSummary && (
                    <View style={styles.cartSummaryBox}>
                        <Ionicons name="basket-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.cartSummaryText} numberOfLines={2}>
                            Cart: <Text style={styles.cartSummaryHighlight}>{item.latestItemsSummary}</Text>
                        </Text>
                    </View>
                )}

                {/* Address Row */}
                <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.error} style={{ marginTop: 2, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressText} numberOfLines={2}>{item.latestAddress}</Text>
                        <Text style={styles.dateSubtext}>
                            Last tried: {formatTimestamp(item.latestTimestamp)}
                        </Text>
                    </View>
                </View>

                {/* Attempt History Accordion Toggle */}
                {item.attemptCount > 1 && (
                    <TouchableOpacity style={styles.historyToggle} onPress={() => toggleExpand(item.userId)}>
                        <Text style={styles.historyToggleText}>
                            {isExpanded ? 'Hide Attempt Timeline' : `View all ${item.attemptCount} attempts`}
                        </Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                )}

                {/* Expanded Timeline */}
                {isExpanded && (
                    <View style={styles.timelineContainer}>
                        {item.requests.map((req, idx) => (
                            <View key={req.id} style={styles.timelineItem}>
                                <View style={styles.timelineDot} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.timelineDate}>{formatTimestamp(req.timestamp)}</Text>
                                    <Text style={styles.timelineAddress} numberOfLines={1}>{req.address}</Text>
                                    {!!req.itemsSummary && (
                                        <Text style={styles.timelineCart}>Items: {req.itemsSummary} {req.cartValue ? `(₹${req.cartValue})` : ''}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Conversion Action Bar */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, !hasPhone && styles.disabledBtn]}
                        disabled={!hasPhone}
                        onPress={() => handleCallCustomer(item.userPhone)}
                    >
                        <Ionicons name="call" size={15} color={COLORS.white} />
                        <Text style={styles.primaryBtnText}>Call</Text>
                    </TouchableOpacity>

                    {canViewCustomerWhatsApp && (
                        <TouchableOpacity
                            style={[styles.whatsappBtn, !hasPhone && styles.disabledBtn]}
                            disabled={!hasPhone}
                            onPress={() => handleWhatsAppLead({
                                name: item.userName,
                                phone: item.userPhone,
                                address: item.latestAddress,
                                cartValue: item.highestCartValue,
                                itemsSummary: item.latestItemsSummary,
                            })}
                        >
                            <Ionicons name="logo-whatsapp" size={16} color="#128C7E" />
                            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => openMaps(item.location.latitude, item.location.longitude)}
                    >
                        <Ionicons name="map-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ─── Render Single Request Card (All Attempts View) ─────────────────
    const renderSingleRequestCard = ({ item }: { item: DemandRequest }) => {
        const statusBadge = getStatusBadgeStyle(item.status);
        const feasBadge = item.nearestZone ? getFeasibilityBadgeStyle(item.nearestZone.feasibility) : null;
        const hasPhone = !!item.userPhone;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(item.userName || 'C').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.customerInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.customerName} numberOfLines={1}>{item.userName || 'Customer'}</Text>
                            <TouchableOpacity
                                style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
                                onPress={() => setStatusModalTarget({
                                    requestId: item.id,
                                    currentStatus: item.status,
                                    customerName: item.userName || 'Customer',
                                })}
                            >
                                <Text style={[styles.statusText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
                                <Ionicons name="chevron-down" size={12} color={statusBadge.text} style={{ marginLeft: 2 }} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.customerPhone}>
                            <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} /> {maskPhone(item.userPhone || '')}
                        </Text>
                    </View>
                </View>

                {/* Chips */}
                <View style={styles.chipsRow}>
                    {feasBadge && item.nearestZone && (
                        <View style={[styles.chip, { backgroundColor: feasBadge.bg }]}>
                            <Ionicons name={feasBadge.icon as any} size={13} color={feasBadge.text} />
                            <Text style={[styles.chipText, { color: feasBadge.text }]}>
                                {item.nearestZone.formattedDistance} from {item.nearestZone.nearestZoneName.split('/')[0]}
                            </Text>
                        </View>
                    )}
                    {item.cartValue ? (
                        <View style={[styles.chip, styles.valueChip]}>
                            <Text style={styles.valueChipText}>💰 ₹{item.cartValue}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Cart summary */}
                {!!item.itemsSummary && (
                    <View style={styles.cartSummaryBox}>
                        <Ionicons name="basket-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.cartSummaryText} numberOfLines={2}>
                            Cart: <Text style={styles.cartSummaryHighlight}>{item.itemsSummary}</Text>
                        </Text>
                    </View>
                )}

                {/* Address */}
                <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.error} style={{ marginTop: 2, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
                        <Text style={styles.dateSubtext}>{formatTimestamp(item.timestamp)}</Text>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, !hasPhone && styles.disabledBtn]}
                        disabled={!hasPhone}
                        onPress={() => handleCallCustomer(item.userPhone || '')}
                    >
                        <Ionicons name="call" size={15} color={COLORS.white} />
                        <Text style={styles.primaryBtnText}>Call</Text>
                    </TouchableOpacity>

                    {canViewCustomerWhatsApp && (
                        <TouchableOpacity
                            style={[styles.whatsappBtn, !hasPhone && styles.disabledBtn]}
                            disabled={!hasPhone}
                            onPress={() => handleWhatsAppLead({
                                name: item.userName || 'there',
                                phone: item.userPhone || '',
                                address: item.address,
                                cartValue: item.cartValue,
                                itemsSummary: item.itemsSummary,
                            })}
                        >
                            <Ionicons name="logo-whatsapp" size={16} color="#128C7E" />
                            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => openMaps(item.location.latitude, item.location.longitude)}
                    >
                        <Ionicons name="map-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <BrandHeader title="Demand Heatmap & Leads" showBack />

            {/* KPI Metrics Dashboard Bar */}
            <View style={styles.metricsContainer}>
                <View style={styles.metricCard}>
                    <Text style={styles.metricNumber}>{metrics.totalUniqueLeads}</Text>
                    <Text style={styles.metricLabel}>Total Leads</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: '#D97706' }]}>{metrics.repeatLeads}</Text>
                    <Text style={styles.metricLabel}>Repeat (≥2)</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: COLORS.primary }]}>₹{metrics.totalPipelineValue}</Text>
                    <Text style={styles.metricLabel}>Cart Value</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCard}>
                    <Text style={[styles.metricNumber, { color: COLORS.success }]}>{metrics.convertedLeads}</Text>
                    <Text style={styles.metricLabel}>Converted</Text>
                </View>
            </View>

            {/* Controls Bar: Search & View Mode Toggle */}
            <View style={styles.controlsSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search by customer name, phone, area..."
                        placeholderTextColor={COLORS.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                    {!!searchQuery && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* View Mode Toggle (Grouped vs All) */}
                <View style={styles.viewModeToggle}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'grouped' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('grouped')}
                    >
                        <Ionicons
                            name="people"
                            size={14}
                            color={viewMode === 'grouped' ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={[styles.toggleText, viewMode === 'grouped' && styles.toggleTextActive]}>
                            By Customer
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'all' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('all')}
                    >
                        <Ionicons
                            name="list"
                            size={14}
                            color={viewMode === 'all' ? COLORS.primary : COLORS.textSecondary}
                        />
                        <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleTextActive]}>
                            All Attempts
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Tabs Bar */}
            <View style={styles.filterScrollWrapper}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[
                        { id: 'all', label: 'All' },
                        { id: 'new', label: 'New Leads' },
                        { id: 'repeat', label: '🔥 Repeat Interest' },
                        { id: 'nearby', label: '🟢 Nearby (<1.5km)' },
                        { id: 'high_value', label: '💎 High Value (≥₹500)' },
                        { id: 'contacted', label: '📞 Contacted' },
                        { id: 'converted', label: '✅ Converted' },
                    ]}
                    keyExtractor={i => i.id}
                    contentContainerStyle={styles.filterTabsList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterTab, activeTab === item.id && styles.filterTabActive]}
                            onPress={() => setActiveTab(item.id as FilterTab)}
                        >
                            <Text style={[styles.filterTabText, activeTab === item.id && styles.filterTabTextActive]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Sorting Row */}
            <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>
                    Showing {viewMode === 'grouped' ? filteredGroupedData.length : filteredAllData.length} {viewMode === 'grouped' ? 'customers' : 'attempts'}
                </Text>
                <View style={styles.sortButtons}>
                    <TouchableOpacity
                        style={[styles.sortPill, sortBy === 'recent' && styles.sortPillActive]}
                        onPress={() => setSortBy('recent')}
                    >
                        <Text style={[styles.sortPillText, sortBy === 'recent' && styles.sortPillTextActive]}>Recent</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sortPill, sortBy === 'value' && styles.sortPillActive]}
                        onPress={() => setSortBy('value')}
                    >
                        <Text style={[styles.sortPillText, sortBy === 'value' && styles.sortPillTextActive]}>Value</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sortPill, sortBy === 'distance' && styles.sortPillActive]}
                        onPress={() => setSortBy('distance')}
                    >
                        <Text style={[styles.sortPillText, sortBy === 'distance' && styles.sortPillTextActive]}>Distance</Text>
                    </TouchableOpacity>
                    {viewMode === 'grouped' && (
                        <TouchableOpacity
                            style={[styles.sortPill, sortBy === 'attempts' && styles.sortPillActive]}
                            onPress={() => setSortBy('attempts')}
                        >
                            <Text style={[styles.sortPillText, sortBy === 'attempts' && styles.sortPillTextActive]}>Attempts</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Main Content List */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Analyzing customer demand & proximity...</Text>
                </View>
            ) : viewMode === 'grouped' ? (
                <FlatList
                    data={filteredGroupedData}
                    renderItem={renderCustomerCard}
                    keyExtractor={item => item.userId}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.xl }]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="sparkles-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No matching demand leads found</Text>
                            <Text style={styles.emptySubtext}>Try adjusting your search query or filters.</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={filteredAllData}
                    renderItem={renderSingleRequestCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACING.xl }]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="sparkles-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No matching attempts found</Text>
                            <Text style={styles.emptySubtext}>Try adjusting your search query or filters.</Text>
                        </View>
                    }
                />
            )}

            {/* Status Update Modal */}
            <Modal
                visible={!!statusModalTarget}
                transparent
                animationType="fade"
                onRequestClose={() => setStatusModalTarget(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Lead Status</Text>
                            <Text style={styles.modalSubtitle}>for {statusModalTarget?.customerName}</Text>
                        </View>

                        <View style={styles.statusOptions}>
                            <TouchableOpacity
                                style={[styles.statusOptionBtn, { borderColor: '#FEF08A', backgroundColor: '#FEF9C3' }]}
                                onPress={() => handleStatusUpdate('new')}
                                disabled={isUpdatingStatus}
                            >
                                <Ionicons name="sparkles" size={18} color="#854D0E" />
                                <Text style={[styles.statusOptionText, { color: '#854D0E' }]}>New Lead (Pending Outreach)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.statusOptionBtn, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}
                                onPress={() => handleStatusUpdate('contacted')}
                                disabled={isUpdatingStatus}
                            >
                                <Ionicons name="call" size={18} color="#1E429F" />
                                <Text style={[styles.statusOptionText, { color: '#1E429F' }]}>Contacted (Follow-up ongoing)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.statusOptionBtn, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}
                                onPress={() => handleStatusUpdate('converted')}
                                disabled={isUpdatingStatus}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#03543F" />
                                <Text style={[styles.statusOptionText, { color: '#03543F' }]}>Converted (Order Booked!)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.statusOptionBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                                onPress={() => handleStatusUpdate('rejected')}
                                disabled={isUpdatingStatus}
                            >
                                <Ionicons name="close-circle" size={18} color="#9B1C1C" />
                                <Text style={[styles.statusOptionText, { color: '#9B1C1C' }]}>Lost / Too Far to Service</Text>
                            </TouchableOpacity>
                        </View>

                        {isUpdatingStatus ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 12 }} />
                        ) : (
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setStatusModalTarget(null)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.pageBg,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    loadingText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },

    // KPI Metrics Bar
    metricsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        ...SHADOWS.sm,
    },
    metricCard: {
        flex: 1,
        alignItems: 'center',
    },
    metricNumber: {
        ...TYPOGRAPHY.heading,
        fontWeight: '700',
        color: COLORS.text,
    },
    metricLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: 2,
        fontSize: 11,
    },
    metricDivider: {
        width: 1,
        height: '70%',
        backgroundColor: COLORS.border,
        alignSelf: 'center',
    },

    // Controls Section
    controlsSection: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundLight,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        height: 40,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.text,
        height: '100%',
    },
    viewModeToggle: {
        flexDirection: 'row',
        marginTop: SPACING.sm,
        backgroundColor: COLORS.backgroundLight,
        borderRadius: RADIUS.sm,
        padding: 2,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: RADIUS.sm - 2,
    },
    toggleBtnActive: {
        backgroundColor: COLORS.white,
        ...SHADOWS.sm,
    },
    toggleText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginLeft: 6,
        fontWeight: '500',
    },
    toggleTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },

    // Filter Tabs
    filterScrollWrapper: {
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterTabsList: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.xs,
    },
    filterTab: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.backgroundLight,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.xs,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterTabText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    filterTabTextActive: {
        color: COLORS.white,
    },

    // Sort Row
    sortRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    sortLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    sortButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    sortPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sortPillActive: {
        backgroundColor: COLORS.primary + '15',
        borderColor: COLORS.primary,
    },
    sortPillText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    sortPillTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },

    // Main Card
    listContent: {
        padding: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    avatarText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.primary,
        fontWeight: '700',
    },
    customerInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    customerName: {
        ...TYPOGRAPHY.bodyBold,
        color: COLORS.text,
        fontSize: 16,
        flex: 1,
        marginRight: SPACING.xs,
    },
    customerPhone: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // Chips Row
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: SPACING.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    repeatChip: {
        backgroundColor: '#FFEDD5',
        borderColor: '#FDBA74',
        borderWidth: 1,
    },
    repeatChipText: {
        fontSize: 11,
        color: '#C2410C',
        fontWeight: '700',
    },
    singleChip: {
        backgroundColor: '#F3F4F6',
    },
    singleChipText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
    },
    valueChip: {
        backgroundColor: COLORS.primary + '15',
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    valueChipText: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '700',
    },

    // Cart Summary
    cartSummaryBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cartSummaryText: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        flex: 1,
    },
    cartSummaryHighlight: {
        color: COLORS.text,
        fontWeight: '600',
    },

    // Address
    addressRow: {
        flexDirection: 'row',
        marginBottom: SPACING.sm,
    },
    addressText: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.text,
        lineHeight: 18,
    },
    dateSubtext: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textLight,
        fontSize: 11,
        marginTop: 2,
    },

    // History Toggle
    historyToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        backgroundColor: '#F8FAFC',
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    historyToggleText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
        marginRight: 4,
    },
    timelineContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: RADIUS.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
        borderLeftWidth: 2,
        borderLeftColor: COLORS.primary,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    timelineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primary,
        marginTop: 5,
        marginRight: 8,
    },
    timelineDate: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.text,
    },
    timelineAddress: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    timelineCart: {
        fontSize: 11,
        color: COLORS.primaryDark,
        fontStyle: 'italic',
    },

    // Action Bar
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        gap: SPACING.sm,
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    primaryBtnText: {
        ...TYPOGRAPHY.button,
        color: COLORS.white,
        fontSize: 13,
        marginLeft: 6,
    },
    whatsappBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E7FCE8',
        paddingVertical: 8,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    whatsappBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803D',
        marginLeft: 6,
    },
    iconBtn: {
        width: 38,
        height: 38,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.backgroundLight,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledBtn: {
        opacity: 0.4,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: SPACING.xl * 2,
    },
    emptyText: {
        ...TYPOGRAPHY.subheading,
        color: COLORS.text,
        marginTop: SPACING.md,
        marginBottom: SPACING.xs,
    },
    emptySubtext: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOWS.lg,
    },
    modalHeader: {
        marginBottom: SPACING.md,
    },
    modalTitle: {
        ...TYPOGRAPHY.heading,
        fontSize: 18,
        color: COLORS.text,
    },
    modalSubtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statusOptions: {
        gap: SPACING.sm,
    },
    statusOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
    },
    statusOptionText: {
        ...TYPOGRAPHY.bodySmall,
        fontWeight: '600',
        marginLeft: 10,
    },
    modalCancelBtn: {
        marginTop: SPACING.md,
        paddingVertical: 10,
        alignItems: 'center',
    },
    modalCancelText: {
        ...TYPOGRAPHY.button,
        color: COLORS.textSecondary,
    },
});
