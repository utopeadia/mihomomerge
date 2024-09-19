function main(config, profileName) {
    // 修改覆写DNS
    if (config.dns) {
        if (config.dns["proxy-server-nameserver"]) {
            const DefaultDNS = config.dns["proxy-server-nameserver"].includes("121.251.251.251");
            if (!DefaultDNS) {
                config.dns["proxy-server-nameserver"].unshift("121.251.251.251");
            }
        }
        if (config.dns["default-nameserver"]) {
            const DefaultDNS = config.dns["default-nameserver"].includes("121.251.251.251");
            if (!DefaultDNS) {
                config.dns["default-nameserver"].unshift("121.251.251.251");
            }
        }
        if (config.dns["nameserver"]) {
            const SystemDNS = config.dns["nameserver"].includes("121.251.251.251");
            if (!SystemDNS) {
                config.dns["nameserver"].unshift("121.251.251.251");
            }
        }
    }
    // 修改ip-version: ipv4-prefer
    // 传入参数：config，需要修改的节点组，修改后内容：dual/ipv4/ipv6/ipv4-prefer/ipv6-prefer
    updateDNSVersionProxyGroup(config, "🛬 新加坡落地", "ipv4-prefer")
    updateDNSVersionProxyGroup(config, "🛬 美国落地", "ipv4-prefer")
    updateDNSVersionProxyGroup(config, "🛬 日本落地", "ipv4-prefer")
    updateDNSVersionProxyGroup(config, "🛬 香港落地", "ipv4-prefer")
    // 传入参数：config，需要添加dialer的节点组，指定为dialer-proxy的节点组，需要替换relay的节点组
    // 后面的配置会替代前面的配置
    updateDialerProxyGroup(config, "🛬 新加坡落地", "🇸🇬 新加坡节点", "🇸🇬 新加坡自建落地");
    updateDialerProxyGroup(config, "🛬 美国落地", "🇺🇲 美国节点", "🇺🇲 美国自建落地");
    updateDialerProxyGroup(config, "🛬 日本落地", "🇯🇵 日本节点", "🇯🇵 日本自建落地");
    updateDialerProxyGroup(config, "🛬 香港落地", "🇭🇰 香港节点", "🇭🇰 香港自建落地");
    // 传入参数：config，需要修改的正则表达式，指定为dialer-proxy的节点组
    // 后面的配置会替代前面的配置
    updateDialerProxy(config, /日本SS-/, "🇯🇵 日本节点");
    updateDialerProxy(config, /香港SS-/, "🇭🇰 香港节点");
    updateDialerProxy(config, /美国SS-/, "🇺🇲 美国节点");
    updateDialerProxy(config, /新加坡SS-/, "🇸🇬 新加坡节点");

    // 修改type为load-balance/fallback/url-test的订阅组lazy为false或true
    updateLazyOption(config, false);
    // 修改type为load-balance/fallback/url-test/select的订阅组disableudp为false或true
    // updateDisableUdpOption(config, false);
    // 修改type为 load-balance的订阅组strategy为consistent-hashing或round-robin
    updateStrategyOption(config, "round-robin");
    // 修改type为"vmess", "vless", "trojan", "ss", "ssr", "tuic"的节udp-over-tcp为为false或true，udp-over-tcp-version版本为2
    updateTcpOverUdpOption(config, true);

    // 正则为规则组添加特定节点
    addProxiesToRegexGroup(config, /Stream/, "DIRECT");

    // 添加规则
    // 传入参数：config，添加的规则，添加位置：push（添加到除final外最后）/unshift（添加到最高优先级）
    addRules(config, "AND,((NETWORK,UDP),(DST-PORT,443),(GEOSITE,youtube)),REJECT", "unshift");

    // 删除指定类型的节点
    // 传入参数：config，需要删除的节点类型
    removeProxiesByType(config, "vless");

    return config;
}

function updateDNSVersionProxyGroup(config, groupName, ipVersion) {
    const group = config["proxy-groups"].find(
        (group) => group.name === groupName
    );

    if (group) {
        group.proxies.forEach((proxyName) => {
            const proxy = (config.proxies || []).find(
                (p) => p.name === proxyName
            );
            if (proxy) {
                proxy["ip-version"] = ipVersion;
            }
        });
    }
}

function updateDialerProxyGroup(config, groupName, dialerProxyName, targetGroupName) {
    const group = config["proxy-groups"].find(
        (group) => group.name === groupName
    );

    if (group) {
        group.proxies.forEach((proxyName) => {
            if (proxyName !== "DIRECT") { // 添加判断，排除 DIRECT 代理
                const proxy = (config.proxies || []).find(
                    (p) => p.name === proxyName
                );
                if (proxy) {
                    proxy["dialer-proxy"] = dialerProxyName;
                }
            }
        });

        if (group.proxies.length > 0) {
            const targetGroupIndex = config["proxy-groups"].findIndex(
                (group) => group.name === targetGroupName
            );
            if (targetGroupIndex !== -1) {
                config["proxy-groups"][targetGroupIndex] = {
                    name: targetGroupName,
                    type: "select",
                    proxies: [groupName],
                };
            }
        }
    }
}

function updateDialerProxy(config, regex, dialerProxyName) {
    const matchingProxies = config.proxies.filter(proxy => regex.test(proxy.name) && proxy.name !== "DIRECT");

    matchingProxies.forEach(proxy => {
        proxy["dialer-proxy"] = dialerProxyName;
    });
}

function updateLazyOption(config, status) {
    const targetTypes = ["load-balance", "fallback", "url-test"];

    config["proxy-groups"].forEach(group => {
        if (targetTypes.includes(group.type)) {
            group["lazy"] = status;
        }
    });
}

function updateDisableUdpOption(config, status) {
    const targetTypes = ["load-balance", "fallback", "url-test", "select"];

    config["proxy-groups"].forEach(group => {
        if (targetTypes.includes(group.type)) {
            group["disable-udp"] = status;
        }
    });
}

function updateStrategyOption(config, status) {
    const targetTypes = ["load-balance"];

    config["proxy-groups"].forEach(group => {
        if (targetTypes.includes(group.type)) {
            group["strategy"] = status;
        }
    });
}

function updateTcpOverUdpOption(config, status) {
    const targetTypes = ["vmess", "vless", "trojan", "ss", "ssr", "tuic"];

    config["proxies"].forEach(group => {
        if (targetTypes.includes(group.type)) {
            group["udp-over-tcp"] = status;
            group["udp-over-tcp-version"] = 2;
        }
    });
}

function addProxiesToRegexGroup(config, regex, newProxies) {
    const targetGroups = config["proxy-groups"].filter(group => regex.test(group.name));
    targetGroups.forEach(targetGroup => {
        if (!Array.isArray(newProxies)) {
            newProxies = [newProxies];
        }
        newProxies.forEach(proxy => {
            if (!targetGroup.proxies.includes(proxy)) {
                targetGroup.proxies.push(proxy);
            }
        });
    });
}

function addRules(config, newrule, position) {
    if (position === "push") {
        config["rules"].splice(-1, 0, newrule);
    } else {
        config["rules"].unshift(newrule);
    }
}

function removeProxiesByType(config, type) {
    const removedProxyNames = [];
    config.proxies = config.proxies.filter(proxy => {
        if (proxy.type === type) {
            removedProxyNames.push(proxy.name);
            return false;
        }
        return true;
    });
    config["proxy-groups"].forEach(group => {
        group.proxies = group.proxies.filter(proxyName => !removedProxyNames.includes(proxyName));
    });
}
