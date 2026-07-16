const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Store active ghost ping channels per guild: { guildId: Set of channelIds }
const activeChannels = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Handle commands
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  
  const content = message.content.toLowerCase().trim();
  
  // Check for admin permissions
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return;
  }

  if (content === '.start') {
    const guildId = message.guild.id;
    const channelId = message.channel.id;
    
    if (!activeChannels.has(guildId)) {
      activeChannels.set(guildId, new Set());
    }
    
    const guildChannels = activeChannels.get(guildId);
    
    if (guildChannels.has(channelId)) {
      return message.reply('⚠️ Already started. Ghost ping is active in this channel.')
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    }
    
    guildChannels.add(channelId);
    message.reply('✅ Ghost ping activated. New members will be pinged here.')
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    message.delete().catch(() => {});
  }

  if (content === '.stop') {
    const guildId = message.guild.id;
    const channelId = message.channel.id;
    
    const guildChannels = activeChannels.get(guildId);
    
    if (!guildChannels || !guildChannels.has(channelId)) {
      return message.reply('⚠️ No ghost ping is active in this channel.')
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    }
    
    guildChannels.delete(channelId);
    message.reply('🛑 Ghost ping deactivated for this channel.')
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    message.delete().catch(() => {});
  }
});

// Ghost ping on member join
client.on('guildMemberAdd', async (member) => {
  const guildId = member.guild.id;
  const guildChannels = activeChannels.get(guildId);
  
  if (!guildChannels || guildChannels.size === 0) return;
  
  for (const channelId of guildChannels) {
    try {
      const channel = await member.guild.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        const msg = await channel.send(`<@${member.id}>`);
        // Delete immediately (fastest possible)
        msg.delete().catch(() => {});
      }
    } catch (error) {
      // Channel may have been deleted, remove from active list
      guildChannels.delete(channelId);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
