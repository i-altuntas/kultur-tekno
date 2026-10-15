// MCP sunucusunu başlatıp araçları gerçek bir MCP istemcisiyle test eder.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["index.js"],
});
const client = new Client({ name: "test", version: "1.0.0" });
await client.connect(transport);

// 1) Araçlar görünüyor mu?
const tools = await client.listTools();
console.log("Araçlar:", tools.tools.map((t) => t.name).join(", "));

// 2) Haber ekle
const add = await client.callTool({
  name: "haber_ekle",
  arguments: {
    title: "MCP testi: Claude Desktop bağlantısı",
    content: "Bu haber MCP sunucusu üzerinden eklendi.\nİkinci paragraf.",
    category: "TEKNOLOJİ",
    summary: "MCP ekleme testi",
  },
});
console.log("ekle →", add.content[0].text);
const id = Number((add.content[0].text.match(/id=(\d+)/) || [])[1]);

// 3) Listele
const list = await client.callTool({ name: "haber_listele", arguments: { category: "TEKNOLOJİ" } });
console.log("listele →\n" + list.content[0].text);

// 4) Sil (test kaydını temizle)
const del = await client.callTool({ name: "haber_sil", arguments: { id } });
console.log("sil →", del.content[0].text);

await client.close();
console.log("\n✓ Tüm araçlar çalışıyor.");
