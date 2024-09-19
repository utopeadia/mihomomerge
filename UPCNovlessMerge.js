function main(config, profileName) {

    updateDNS(config, [
        ["proxy-server-nameserver", "121.251.251.251"],
        ["default-nameserver", "121.251.251.251"],
        ["nameserver", "121.251.251.251"]
    ]);

    // 修改落地节点 IP 版本
    updateProxyOptionByGroup(config, "name", ["🛬 新加坡落地", "🛬 美国落地", "🛬 日本落地", "🛬 香港落地"], "ip-version", "ipv4-prefer");

    // 设置dialer-proxy
    updateDialerProxyGroup(config, [
        ["🛬 新加坡落地", "🇸🇬 新加坡节点", "🇸🇬 新加坡自建落地"],
        ["🛬 美国落地", "🇺🇲 美国节点", "🇺🇲 美国自建落地"],
        ["🛬 日本落地", "🇯🇵 日本节点", "🇯🇵 日本自建落地"],
        ["🛬 香港落地", "🇭🇰 香港节点", "🇭🇰 香港自建落地"]
    ]);

    // 修改节点dialer-proxy (正则匹配)
    updateProxyOption(config, "name", /日本穿透SS-/, "dialer-proxy", "🇯🇵 日本节点");
    updateProxyOption(config, "name", /香港穿透SS-/, "dialer-proxy", "🇭🇰 香港节点");
    updateProxyOption(config, "name", /美国穿透SS-/, "dialer-proxy", "🇺🇲 美国节点");
    updateProxyOption(config, "name", /新加坡穿透SS-/, "dialer-proxy", "🇸🇬 新加坡节点");

    // 修改订阅组选项
    updateGroupOption(config, "type", ["load-balance", "fallback", "url-test"], "lazy", false);
    updateGroupOption(config, "type", ["load-balance"], "strategy", "round-robin");

    // 修改节点 UDP over TCP 选项
    updateProxyOption(config, "type", ["vmess", "vless", "trojan", "ss", "ssr", "tuic"], "udp-over-tcp", true);

    // 添加节点到正则组
    addProxiesToRegexGroup(config, /Stream/, "DIRECT");

    // 添加规则
    addRules(config, "AND,((NETWORK,UDP),(DST-PORT,443),(GEOSITE,youtube)),REJECT", "unshift");

    // 删除vless节点
    removeProxiesByProperty(config, "type", "vless");

    return config;
}


// 增加DNS
// 传入参数：config, dnsMappings("["proxy-server-nameserver", "121.251.251.251"]")
function updateDNS(config, dnsMappings) {
    if (config.dns) {
        dnsMappings.forEach(([dnsKey, dnsValue]) => {
            if (config.dns[dnsKey]) {
                const hasDNS = config.dns[dnsKey].includes(dnsValue);
                if (!hasDNS) {
                    config.dns[dnsKey].unshift(dnsValue);
                }
            }
        });
    }
}

// 修改节点组内节点dialer-proxy代理并将relay节点组替换为新的节点组
// 传入参数：config, groupMappings([groupName, dialerProxyName, targetGroupName])
// 例如原逻辑为：自建落地（groupName）节点组为：自建节点1、自建节点2，relay节点组（targetGroupName）为：前置节点（dialerProxyName）、自建落地，通过脚本可以将自建节点1、自建节点2添加前置节点作为dialer-proxy代理，并修改relay节点组为select且只保留自建落地节点组
function updateDialerProxyGroup(config, groupMappings) {
    groupMappings.forEach(([groupName, dialerProxyName, targetGroupName]) => {
        const group = config["proxy-groups"].find(group => group.name === groupName);
        if (group) {
            group.proxies.forEach(proxyName => {
                if (proxyName !== "DIRECT") {
                    const proxy = (config.proxies || []).find(p => p.name === proxyName);
                    if (proxy) {
                        proxy["dialer-proxy"] = dialerProxyName;
                    }
                }
            });

            if (group.proxies.length > 0) {
                const targetGroupIndex = config["proxy-groups"].findIndex(group => group.name === targetGroupName);
                if (targetGroupIndex !== -1) {
                    config["proxy-groups"][targetGroupIndex] = {
                        name: targetGroupName,
                        type: "select",
                        proxies: [groupName],
                    };
                }
            }
        }
    });
}

// 修改节点组属性
// 传入参数：config, searchBy, targetGroups, optionName, optionValue
function updateGroupOption(config, searchBy, targetGroups, optionName, optionValue) {
    config["proxy-groups"].forEach(group => {
        if (targetGroups.includes(group[searchBy])) {
            group[optionName] = optionValue;
        }
    });
}

// 修改节点属性
// 传入参数：config, searchBy, targetProxies, optionName, optionValue
function updateProxyOption(config, searchBy, targetProxies, optionName, optionValue) {
    config.proxies.forEach(proxy => {
        if (Array.isArray(targetProxies)) {
            for (const targetProxy of targetProxies) {
                if (targetProxy instanceof RegExp && targetProxy.test(proxy[searchBy])) {
                    proxy[optionName] = optionValue;
                    break;
                } else if (proxy[searchBy] === targetProxy) {
                    proxy[optionName] = optionValue;
                    break;
                }
            }
        } else if (targetProxies instanceof RegExp && targetProxies.test(proxy[searchBy])) {
            proxy[optionName] = optionValue;
        } else if (proxy[searchBy] === targetProxies) {
            proxy[optionName] = optionValue;
        }
    });
}


// 修改节点组内节点属性
// 传入参数：config, searchBy, targetGroups, optionName, optionValue
function updateProxyOptionByGroup(config, searchBy, targetGroups, optionName, optionValue) {
    config["proxy-groups"].forEach(group => {
        if (targetGroups.includes(group[searchBy])) {
            group.proxies.forEach(proxyName => {
                const proxy = (config.proxies || []).find(p => p.name === proxyName);
                if (proxy) {
                    proxy[optionName] = optionValue;
                }
            });
        }
    });
}


// 指定节点到正则匹配节点组
// 传入参数：config, regex, newProxies
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

// 添加规则
// 传入参数：config, newrule, position(push/unshift，默认为unshift，即最高优先级)
function addRules(config, newrule, position) {
    if (position === "push") {
        config["rules"].splice(-1, 0, newrule);
    } else {
        config["rules"].unshift(newrule);
    }
}

// 删除指定属性节点
// 传入参数：config, property(属性), value(值)
function removeProxiesByProperty(config, property, value) {
    const removedProxyNames = [];
    config.proxies = config.proxies.filter(proxy => {
        if (proxy[property] === value) {
            removedProxyNames.push(proxy.name);
            return false;
        }
        return true;
    });
    config["proxy-groups"].forEach(group => {
        group.proxies = group.proxies.filter(proxyName => !removedProxyNames.includes(proxyName));
    });
}
